import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { KnowledgeDocument } from "../../domain/KnowledgeDocument.js";
import type { IKnowledgeDocumentRepository } from "../../application/repositories/IKnowledgeDocumentRepository.js";
import { KnowledgeDocumentFactory, type KnowledgeDocumentRow } from "../factories/KnowledgeDocumentFactory.js";

export class PostgresKnowledgeDocumentRepository implements IKnowledgeDocumentRepository {
  constructor(private readonly db: IDbClient) {}

  async save(document: KnowledgeDocument): Promise<void> {
    await this.db.query(
      `INSERT INTO knowledge_documents (id, business_id, title, source_type, source_filename, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at`,
      [
        document.id,
        document.businessId,
        document.title,
        document.sourceType,
        document.sourceFilename,
        document.createdAt,
        document.updatedAt,
        document.deletedAt,
      ],
    );
  }

  async findById(businessId: string, id: string): Promise<KnowledgeDocument | null> {
    const result = await this.db.query<KnowledgeDocumentRow>(
      `SELECT * FROM knowledge_documents WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId],
    );
    const row = result.rows[0];
    return row ? KnowledgeDocumentFactory.toDomain(row) : null;
  }

  async findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: KnowledgeDocument[]; total: number }> {
    const result = await this.db.query<KnowledgeDocumentRow & { total_count: string }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM knowledge_documents
       WHERE business_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [businessId, pagination.limit, pagination.offset],
    );

    const items = result.rows.map((row) => KnowledgeDocumentFactory.toDomain(row));
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count) : 0;

    return { items, total };
  }

  async countByBusinessId(businessId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM knowledge_documents WHERE business_id = $1 AND deleted_at IS NULL`,
      [businessId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}
