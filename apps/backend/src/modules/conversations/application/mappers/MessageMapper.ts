import type { Message } from "../../domain/Message.js";
import type { MessageOutputDTO } from "../dtos/MessageDTO.js";

export class MessageMapper {
  static toDTO(message: Message): MessageOutputDTO {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
