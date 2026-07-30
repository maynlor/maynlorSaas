import type { Client } from "../../domain/Client.js";

export interface IClientRepository {
  save(client: Client): Promise<void>;
  findById(businessId: string, id: string): Promise<Client | null>;
  findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Client[]; total: number }>;
  existsByPhone(businessId: string, phone: string): Promise<boolean>;
  findByPhone(businessId: string, phone: string): Promise<Client | null>;
}
