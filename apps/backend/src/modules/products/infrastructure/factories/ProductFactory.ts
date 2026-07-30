import { Product } from "../../domain/Product.js";

export interface ProductRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  stock: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class ProductFactory {
  static toDomain(row: ProductRow): Product {
    return Product.reconstitute({
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      currency: row.currency,
      stock: row.stock,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
