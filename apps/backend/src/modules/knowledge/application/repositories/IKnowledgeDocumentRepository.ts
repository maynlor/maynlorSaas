import type { KnowledgeDocument } from "../../domain/KnowledgeDocument.js";

export interface IKnowledgeDocumentRepository {
  save(document: KnowledgeDocument): Promise<void>;
  findById(businessId: string, id: string): Promise<KnowledgeDocument | null>;
  findAll(
    businessId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ items: KnowledgeDocument[]; total: number }>;
  countByBusinessId(businessId: string): Promise<number>;
}
