import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Product } from "../../domain/Product.js";
import type { IProductRepository } from "../../application/repositories/IProductRepository.js";
import { ProductFactory, type ProductRow } from "../factories/ProductFactory.js";

function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export class PostgresProductRepository implements IProductRepository {
  constructor(private readonly db: IDbClient) {}

  async save(product: Product): Promise<void> {
    await this.db.query(
      `INSERT INTO products (id, business_id, name, description, price, currency, stock, is_active, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         price = EXCLUDED.price,
         currency = EXCLUDED.currency,
         stock = EXCLUDED.stock,
         is_active = EXCLUDED.is_active,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at`,
      [
        product.id,
        product.businessId,
        product.name,
        product.description,
        product.price,
        product.currency,
        product.stock,
        product.isActive,
        product.createdAt,
        product.updatedAt,
        product.deletedAt,
      ],
    );
  }

  async findById(businessId: string, id: string): Promise<Product | null> {
    const result = await this.db.query<ProductRow>(
      `SELECT * FROM products WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId],
    );
    const row = result.rows[0];
    return row ? ProductFactory.toDomain(row) : null;
  }

  async findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Product[]; total: number }> {
    const result = await this.db.query<ProductRow & { total_count: string }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM products
       WHERE business_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, pagination.limit, pagination.offset],
    );

    const items = result.rows.map((row) => ProductFactory.toDomain(row));
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count) : 0;

    return { items, total };
  }

  async search(businessId: string, term: string, limit: number): Promise<Product[]> {
    const pattern = `%${escapeLikeTerm(term.trim())}%`;
    const result = await this.db.query<ProductRow>(
      `SELECT * FROM products
       WHERE business_id = $1
         AND deleted_at IS NULL
         AND is_active = TRUE
         AND (name ILIKE $2 OR description ILIKE $2)
       ORDER BY name ASC
       LIMIT $3`,
      [businessId, pattern, limit],
    );
    return result.rows.map((row) => ProductFactory.toDomain(row));
  }

  async countByBusinessId(businessId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products WHERE business_id = $1 AND deleted_at IS NULL`,
      [businessId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}
