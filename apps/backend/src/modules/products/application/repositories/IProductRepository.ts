import type { Product } from "../../domain/Product.js";

export interface IProductRepository {
  save(product: Product): Promise<void>;
  findById(businessId: string, id: string): Promise<Product | null>;
  findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Product[]; total: number }>;
  search(businessId: string, term: string, limit: number): Promise<Product[]>;
  countByBusinessId(businessId: string): Promise<number>;
}
