import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Conversation } from "../../domain/Conversation.js";
import type { IConversationRepository } from "../../application/repositories/IConversationRepository.js";
import { ConversationFactory, type ConversationRow } from "../factories/ConversationFactory.js";

export class PostgresConversationRepository implements IConversationRepository {
  constructor(private readonly db: IDbClient) {}

  async save(conversation: Conversation): Promise<void> {
    await this.db.query(
      `INSERT INTO conversations (id, business_id, client_id, channel, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         channel = EXCLUDED.channel,
         updated_at = EXCLUDED.updated_at`,
      [
        conversation.id,
        conversation.businessId,
        conversation.clientId,
        conversation.channel,
        conversation.createdAt,
        conversation.updatedAt,
      ],
    );
  }

  async findById(businessId: string, id: string): Promise<Conversation | null> {
    const result = await this.db.query<ConversationRow>(
      `SELECT * FROM conversations WHERE id = $1 AND business_id = $2`,
      [id, businessId],
    );
    const row = result.rows[0];
    return row ? ConversationFactory.toDomain(row) : null;
  }

  async findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Conversation[]; total: number }> {
    const result = await this.db.query<ConversationRow & { total_count: string }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM conversations
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, pagination.limit, pagination.offset],
    );

    const items = result.rows.map((row) => ConversationFactory.toDomain(row));
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count) : 0;

    return { items, total };
  }

  async findLatestByClientAndChannel(
    businessId: string,
    clientId: string,
    channel: string,
  ): Promise<Conversation | null> {
    const result = await this.db.query<ConversationRow>(
      `SELECT * FROM conversations
       WHERE business_id = $1 AND client_id = $2 AND channel = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [businessId, clientId, channel],
    );
    const row = result.rows[0];
    return row ? ConversationFactory.toDomain(row) : null;
  }

  async countCreatedSince(businessId: string, since: Date): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM conversations WHERE business_id = $1 AND created_at >= $2`,
      [businessId, since],
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}
