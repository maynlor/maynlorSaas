import type { KnowledgeDocumentSourceType } from "../../domain/KnowledgeDocument.js";

export interface UploadKnowledgeDocumentTextInputDTO {
  title: string;
  sourceType: "text";
  content: string;
}

export interface UploadKnowledgeDocumentPdfInputDTO {
  title: string;
  sourceType: "pdf";
  file: { buffer: Buffer; filename: string };
}

export type UploadKnowledgeDocumentInputDTO =
  | UploadKnowledgeDocumentTextInputDTO
  | UploadKnowledgeDocumentPdfInputDTO;

export interface KnowledgeDocumentOutputDTO {
  id: string;
  title: string;
  sourceType: KnowledgeDocumentSourceType;
  sourceFilename: string | null;
  createdAt: string;
}

export interface ListKnowledgeDocumentsOutputDTO {
  items: KnowledgeDocumentOutputDTO[];
  total: number;
  page: number;
  pageSize: number;
}
