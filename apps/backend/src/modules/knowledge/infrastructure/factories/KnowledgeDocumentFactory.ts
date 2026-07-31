import { KnowledgeDocument, type KnowledgeDocumentSourceType } from "../../domain/KnowledgeDocument.js";

export interface KnowledgeDocumentRow {
  id: string;
  business_id: string;
  title: string;
  source_type: string;
  source_filename: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class KnowledgeDocumentFactory {
  static toDomain(row: KnowledgeDocumentRow): KnowledgeDocument {
    return KnowledgeDocument.reconstitute({
      id: row.id,
      businessId: row.business_id,
      title: row.title,
      sourceType: row.source_type as KnowledgeDocumentSourceType,
      sourceFilename: row.source_filename,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
