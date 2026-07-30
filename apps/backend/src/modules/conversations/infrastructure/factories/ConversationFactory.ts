import { Conversation } from "../../domain/Conversation.js";

export interface ConversationRow {
  id: string;
  business_id: string;
  client_id: string;
  channel: string;
  created_at: Date;
  updated_at: Date;
}

export class ConversationFactory {
  static toDomain(row: ConversationRow): Conversation {
    return Conversation.reconstitute({
      id: row.id,
      businessId: row.business_id,
      clientId: row.client_id,
      channel: row.channel,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
