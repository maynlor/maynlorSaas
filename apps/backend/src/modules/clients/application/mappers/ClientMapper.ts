import type { Client } from "../../domain/Client.js";
import type { ClientOutputDTO } from "../dtos/ClientDTO.js";

export class ClientMapper {
  static toDTO(client: Client): ClientOutputDTO {
    return {
      id: client.id,
      businessId: client.businessId,
      name: client.name,
      phone: client.phone,
      email: client.email,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }
}
