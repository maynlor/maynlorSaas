import { Message, type MessageRole } from "../../domain/Message.js";

export interface MessageRow {
  id: string;
  conversation_id: string;
  business_id: string;
  role: string;
  content: string;
  created_at: Date;
}

export class MessageFactory {
  static toDomain(row: MessageRow): Message {
    return Message.reconstitute({
      id: row.id,
      conversationId: row.conversation_id,
      businessId: row.business_id,
      role: row.role as MessageRole,
      content: row.content,
      createdAt: row.created_at,
    });
  }
}
