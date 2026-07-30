import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Business } from "../../domain/Business.js";
import type { IBusinessRepository } from "../../application/repositories/IBusinessRepository.js";
import { BusinessFactory, type BusinessRow } from "../factories/BusinessFactory.js";

export class PostgresBusinessRepository implements IBusinessRepository {
  constructor(private readonly db: IDbClient) {}

  async save(business: Business): Promise<void> {
    await this.db.query(
      `INSERT INTO businesses (id, name, email, slug, is_active, whatsapp_phone_number_id, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         slug = EXCLUDED.slug,
         is_active = EXCLUDED.is_active,
         whatsapp_phone_number_id = EXCLUDED.whatsapp_phone_number_id,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at`,
      [
        business.id,
        business.name,
        business.email,
        business.slug,
        business.isActive,
        business.whatsappPhoneNumberId,
        business.createdAt,
        business.updatedAt,
        business.isDeleted ? new Date() : null,
      ],
    );
  }

  async findById(id: string): Promise<Business | null> {
    const result = await this.db.query<BusinessRow>(
      `SELECT * FROM businesses WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    const row = result.rows[0];
    return row ? BusinessFactory.toDomain(row) : null;
  }

  async findBySlug(slug: string): Promise<Business | null> {
    const result = await this.db.query<BusinessRow>(
      `SELECT * FROM businesses WHERE slug = $1 AND deleted_at IS NULL`,
      [slug],
    );
    const row = result.rows[0];
    return row ? BusinessFactory.toDomain(row) : null;
  }

  async findByWhatsAppPhoneNumberId(phoneNumberId: string): Promise<Business | null> {
    const result = await this.db.query<BusinessRow>(
      `SELECT * FROM businesses WHERE whatsapp_phone_number_id = $1 AND deleted_at IS NULL`,
      [phoneNumberId],
    );
    const row = result.rows[0];
    return row ? BusinessFactory.toDomain(row) : null;
  }

  async findAll(pagination: { limit: number; offset: number }): Promise<{
    items: Business[];
    total: number;
  }> {
    const result = await this.db.query<BusinessRow & { total_count: string }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM businesses
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [pagination.limit, pagination.offset],
    );

    const items = result.rows.map((row) => BusinessFactory.toDomain(row));
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count) : 0;

    return { items, total };
  }

  async existsByEmailOrSlug(email: string, slug: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM businesses WHERE (email = $1 OR slug = $2) AND deleted_at IS NULL LIMIT 1`,
      [email, slug],
    );
    return result.rowCount > 0;
  }
}
