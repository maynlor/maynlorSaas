import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Message } from "../../domain/Message.js";
import type { IMessageRepository } from "../../application/repositories/IMessageRepository.js";
import { MessageFactory, type MessageRow } from "../factories/MessageFactory.js";

export class PostgresMessageRepository implements IMessageRepository {
  constructor(private readonly db: IDbClient) {}

  async save(message: Message): Promise<void> {
    await this.db.query(
      `INSERT INTO messages (id, conversation_id, business_id, role, content, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        message.id,
        message.conversationId,
        message.businessId,
        message.role,
        message.content,
        message.createdAt,
      ],
    );
  }

  async findByConversationId(
    businessId: string,
    conversationId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Message[]; total: number }> {
    const result = await this.db.query<MessageRow & { total_count: string }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM messages
       WHERE business_id = $1 AND conversation_id = $2
       ORDER BY created_at ASC
       LIMIT $3 OFFSET $4`,
      [businessId, conversationId, pagination.limit, pagination.offset],
    );

    const items = result.rows.map((row) => MessageFactory.toDomain(row));
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count) : 0;

    return { items, total };
  }

  async findRecentByConversationId(
    businessId: string,
    conversationId: string,
    limit: number,
  ): Promise<Message[]> {
    // Se traen en DESC (así el LIMIT se queda con los más nuevos, y el índice
    // (conversation_id, created_at) lo resuelve sin ordenamiento extra) y se
    // invierten en memoria, porque el modelo necesita orden cronológico.
    // El desempate por `id` hace determinista el corte cuando dos mensajes
    // comparten `created_at`.
    const result = await this.db.query<MessageRow>(
      `SELECT *
       FROM messages
       WHERE business_id = $1 AND conversation_id = $2
       ORDER BY created_at DESC, id DESC
       LIMIT $3`,
      [businessId, conversationId, limit],
    );

    return result.rows.map((row) => MessageFactory.toDomain(row)).reverse();
  }
}
