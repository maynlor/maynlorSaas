import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Service } from "../../domain/Service.js";
import type { IServiceRepository } from "../../application/repositories/IServiceRepository.js";
import { ServiceFactory, type ServiceRow } from "../factories/ServiceFactory.js";

function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export class PostgresServiceRepository implements IServiceRepository {
  constructor(private readonly db: IDbClient) {}

  async save(service: Service): Promise<void> {
    await this.db.query(
      `INSERT INTO services (id, business_id, name, description, price, currency, duration_minutes, is_active, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         price = EXCLUDED.price,
         currency = EXCLUDED.currency,
         duration_minutes = EXCLUDED.duration_minutes,
         is_active = EXCLUDED.is_active,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at`,
      [
        service.id,
        service.businessId,
        service.name,
        service.description,
        service.price,
        service.currency,
        service.durationMinutes,
        service.isActive,
        service.createdAt,
        service.updatedAt,
        service.deletedAt,
      ],
    );
  }

  async findById(businessId: string, id: string): Promise<Service | null> {
    const result = await this.db.query<ServiceRow>(
      `SELECT * FROM services WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId],
    );
    const row = result.rows[0];
    return row ? ServiceFactory.toDomain(row) : null;
  }

  async findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Service[]; total: number }> {
    const result = await this.db.query<ServiceRow & { total_count: string }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM services
       WHERE business_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, pagination.limit, pagination.offset],
    );

    const items = result.rows.map((row) => ServiceFactory.toDomain(row));
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count) : 0;

    return { items, total };
  }

  async search(businessId: string, term: string, limit: number): Promise<Service[]> {
    const pattern = `%${escapeLikeTerm(term.trim())}%`;
    const result = await this.db.query<ServiceRow>(
      `SELECT * FROM services
       WHERE business_id = $1
         AND deleted_at IS NULL
         AND is_active = TRUE
         AND (name ILIKE $2 OR description ILIKE $2)
       ORDER BY name ASC
       LIMIT $3`,
      [businessId, pattern, limit],
    );
    return result.rows.map((row) => ServiceFactory.toDomain(row));
  }
}
