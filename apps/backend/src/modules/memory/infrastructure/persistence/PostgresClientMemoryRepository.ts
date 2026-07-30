import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { ClientMemory } from "../../domain/ClientMemory.js";
import type { IClientMemoryRepository } from "../../application/repositories/IClientMemoryRepository.js";
import { ClientMemoryFactory, type ClientMemoryRow } from "../factories/ClientMemoryFactory.js";

export class PostgresClientMemoryRepository implements IClientMemoryRepository {
  constructor(private readonly db: IDbClient) {}

  async save(memory: ClientMemory): Promise<void> {
    await this.db.query(
      `INSERT INTO client_memories (id, business_id, client_id, content, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [memory.id, memory.businessId, memory.clientId, memory.content, memory.createdAt],
    );
  }

  async findByClientId(businessId: string, clientId: string, limit: number): Promise<ClientMemory[]> {
    const result = await this.db.query<ClientMemoryRow>(
      `SELECT * FROM client_memories
       WHERE business_id = $1 AND client_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [businessId, clientId, limit],
    );
    return result.rows.map((row) => ClientMemoryFactory.toDomain(row));
  }

  async findById(businessId: string, id: string): Promise<ClientMemory | null> {
    const result = await this.db.query<ClientMemoryRow>(
      `SELECT * FROM client_memories WHERE id = $1 AND business_id = $2`,
      [id, businessId],
    );
    const row = result.rows[0];
    return row ? ClientMemoryFactory.toDomain(row) : null;
  }

  async delete(businessId: string, id: string): Promise<void> {
    await this.db.query(`DELETE FROM client_memories WHERE id = $1 AND business_id = $2`, [
      id,
      businessId,
    ]);
  }
}
