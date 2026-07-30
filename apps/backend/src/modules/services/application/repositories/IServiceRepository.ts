import type { Service } from "../../domain/Service.js";

export interface IServiceRepository {
  save(service: Service): Promise<void>;
  findById(businessId: string, id: string): Promise<Service | null>;
  findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Service[]; total: number }>;
  search(businessId: string, term: string, limit: number): Promise<Service[]>;
}
