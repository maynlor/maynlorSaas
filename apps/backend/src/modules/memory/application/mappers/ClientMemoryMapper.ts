import type { ClientMemory } from "../../domain/ClientMemory.js";
import type { ClientMemoryOutputDTO } from "../dtos/ClientMemoryDTO.js";

export class ClientMemoryMapper {
  static toDTO(memory: ClientMemory): ClientMemoryOutputDTO {
    return {
      id: memory.id,
      businessId: memory.businessId,
      clientId: memory.clientId,
      content: memory.content,
      createdAt: memory.createdAt.toISOString(),
    };
  }
}
