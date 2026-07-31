import type { KnowledgeDocument } from "../../domain/KnowledgeDocument.js";
import type { KnowledgeDocumentOutputDTO } from "../dtos/KnowledgeDocumentDTO.js";

export class KnowledgeDocumentMapper {
  static toDTO(document: KnowledgeDocument): KnowledgeDocumentOutputDTO {
    return {
      id: document.id,
      title: document.title,
      sourceType: document.sourceType,
      sourceFilename: document.sourceFilename,
      createdAt: document.createdAt.toISOString(),
    };
  }
}
