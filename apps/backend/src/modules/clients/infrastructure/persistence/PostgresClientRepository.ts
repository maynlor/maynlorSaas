import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Client } from "../../domain/Client.js";
import type { IClientRepository } from "../../application/repositories/IClientRepository.js";
import { ClientFactory, type ClientRow } from "../factories/ClientFactory.js";

export class PostgresClientRepository implements IClientRepository {
  constructor(private readonly db: IDbClient) {}

  async save(client: Client): Promise<void> {
    await this.db.query(
      `INSERT INTO clients (id, business_id, name, phone, email, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at`,
      [
        client.id,
        client.businessId,
        client.name,
        client.phone,
        client.email,
        client.createdAt,
        client.updatedAt,
        client.isDeleted ? new Date() : null,
      ],
    );
  }

  async findById(businessId: string, id: string): Promise<Client | null> {
    const result = await this.db.query<ClientRow>(
      `SELECT * FROM clients WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId],
    );
    const row = result.rows[0];
    return row ? ClientFactory.toDomain(row) : null;
  }

  async findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Client[]; total: number }> {
    const result = await this.db.query<ClientRow & { total_count: string }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM clients
       WHERE business_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, pagination.limit, pagination.offset],
    );

    const items = result.rows.map((row) => ClientFactory.toDomain(row));
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count) : 0;

    return { items, total };
  }

  async existsByPhone(businessId: string, phone: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM clients WHERE business_id = $1 AND phone = $2 AND deleted_at IS NULL LIMIT 1`,
      [businessId, phone],
    );
    return result.rowCount > 0;
  }

  async findByPhone(businessId: string, phone: string): Promise<Client | null> {
    const result = await this.db.query<ClientRow>(
      `SELECT * FROM clients WHERE business_id = $1 AND phone = $2 AND deleted_at IS NULL`,
      [businessId, phone],
    );
    const row = result.rows[0];
    return row ? ClientFactory.toDomain(row) : null;
  }
}
