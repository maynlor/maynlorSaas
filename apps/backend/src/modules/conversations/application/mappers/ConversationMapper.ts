import type { Conversation } from "../../domain/Conversation.js";
import type { ConversationOutputDTO } from "../dtos/ConversationDTO.js";

export class ConversationMapper {
  static toDTO(conversation: Conversation): ConversationOutputDTO {
    return {
      id: conversation.id,
      clientId: conversation.clientId,
      channel: conversation.channel,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }
}
