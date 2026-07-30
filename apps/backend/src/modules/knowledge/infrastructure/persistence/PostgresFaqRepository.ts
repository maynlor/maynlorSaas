import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Faq } from "../../domain/Faq.js";
import type { IFaqRepository } from "../../application/repositories/IFaqRepository.js";
import { FaqFactory, type FaqRow } from "../factories/FaqFactory.js";

function escapeLikeTerm(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export class PostgresFaqRepository implements IFaqRepository {
  constructor(private readonly db: IDbClient) {}

  async save(faq: Faq): Promise<void> {
    await this.db.query(
      `INSERT INTO faqs (id, business_id, question, answer, is_active, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         question = EXCLUDED.question,
         answer = EXCLUDED.answer,
         is_active = EXCLUDED.is_active,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at`,
      [
        faq.id,
        faq.businessId,
        faq.question,
        faq.answer,
        faq.isActive,
        faq.createdAt,
        faq.updatedAt,
        faq.deletedAt,
      ],
    );
  }

  async findById(businessId: string, id: string): Promise<Faq | null> {
    const result = await this.db.query<FaqRow>(
      `SELECT * FROM faqs WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId],
    );
    const row = result.rows[0];
    return row ? FaqFactory.toDomain(row) : null;
  }

  async findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: Faq[]; total: number }> {
    const result = await this.db.query<FaqRow & { total_count: string }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM faqs
       WHERE business_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, pagination.limit, pagination.offset],
    );

    const items = result.rows.map((row) => FaqFactory.toDomain(row));
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count) : 0;

    return { items, total };
  }

  async search(businessId: string, term: string, limit: number): Promise<Faq[]> {
    const pattern = `%${escapeLikeTerm(term.trim())}%`;
    const result = await this.db.query<FaqRow>(
      `SELECT * FROM faqs
       WHERE business_id = $1
         AND deleted_at IS NULL
         AND is_active = TRUE
         AND (question ILIKE $2 OR answer ILIKE $2)
       ORDER BY question ASC
       LIMIT $3`,
      [businessId, pattern, limit],
    );
    return result.rows.map((row) => FaqFactory.toDomain(row));
  }
}
