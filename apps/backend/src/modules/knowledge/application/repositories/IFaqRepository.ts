import type { Faq } from "../../domain/Faq.js";

export interface IFaqRepository {
  save(faq: Faq): Promise<void>;
  findById(businessId: string, id: string): Promise<Faq | null>;
  findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Faq[]; total: number }>;
  search(businessId: string, term: string, limit: number): Promise<Faq[]>;
}
