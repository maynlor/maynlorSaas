import type { DocumentChunk } from "../../domain/DocumentChunk.js";

export interface SimilarChunk {
  chunk: DocumentChunk;
  /** Similitud coseno con la consulta: 1 = idéntico, 0 = sin relación, negativo = opuesto. */
  similarity: number;
}

export interface IDocumentChunkRepository {
  saveMany(chunks: DocumentChunk[]): Promise<void>;
  deleteByDocumentId(documentId: string): Promise<void>;
  /** Los k fragmentos del negocio más similares al embedding de la consulta. */
  searchSimilar(businessId: string, queryEmbedding: number[], limit: number): Promise<SimilarChunk[]>;
}
