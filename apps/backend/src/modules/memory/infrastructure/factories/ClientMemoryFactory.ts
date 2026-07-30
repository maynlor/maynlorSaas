import { ClientMemory } from "../../domain/ClientMemory.js";

export interface ClientMemoryRow {
  id: string;
  business_id: string;
  client_id: string;
  content: string;
  created_at: Date;
}

export class ClientMemoryFactory {
  static toDomain(row: ClientMemoryRow): ClientMemory {
    const result = ClientMemory.reconstitute({
      id: row.id,
      businessId: row.business_id,
      clientId: row.client_id,
      content: row.content,
      createdAt: row.created_at,
    });
    if (result.isFailure) {
      throw new Error(`Corrupt client memory row ${row.id}: ${result.error.message}`);
    }
    return result.value;
  }
}
