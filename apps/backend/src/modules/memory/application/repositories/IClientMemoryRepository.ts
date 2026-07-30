import type { ClientMemory } from "../../domain/ClientMemory.js";

export interface IClientMemoryRepository {
  save(memory: ClientMemory): Promise<void>;
  findByClientId(businessId: string, clientId: string, limit: number): Promise<ClientMemory[]>;
  findById(businessId: string, id: string): Promise<ClientMemory | null>;
  delete(businessId: string, id: string): Promise<void>;
}
