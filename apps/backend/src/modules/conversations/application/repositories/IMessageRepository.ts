import type { Message } from "../../domain/Message.js";

export interface IMessageRepository {
  save(message: Message): Promise<void>;
  findByConversationId(
    businessId: string,
    conversationId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Message[]; total: number }>;
}
