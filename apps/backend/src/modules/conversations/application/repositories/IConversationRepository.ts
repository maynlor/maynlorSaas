import type { Conversation } from "../../domain/Conversation.js";

export interface IConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(businessId: string, id: string): Promise<Conversation | null>;
  findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Conversation[]; total: number }>;
  findLatestByClientAndChannel(
    businessId: string,
    clientId: string,
    channel: string,
  ): Promise<Conversation | null>;
}
