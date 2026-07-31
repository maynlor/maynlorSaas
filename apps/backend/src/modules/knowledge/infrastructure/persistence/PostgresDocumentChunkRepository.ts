import type { IDbClient } from "../../../../shared/database/DbClient.js";
import type { DocumentChunk } from "../../domain/DocumentChunk.js";
import type {
  IDocumentChunkRepository,
  SimilarChunk,
} from "../../application/repositories/IDocumentChunkRepository.js";
import {
  DocumentChunkFactory,
  embeddingToVectorLiteral,
  type DocumentChunkRow,
} from "../factories/DocumentChunkFactory.js";

export class PostgresDocumentChunkRepository implements IDocumentChunkRepository {
  constructor(private readonly db: IDbClient) {}

  async saveMany(chunks: DocumentChunk[]): Promise<void> {
    // Uno por uno en vez de un INSERT multi-fila: los documentos son cortos
    // (decenas de fragmentos como mucho) y así se mantiene la query simple.
    for (const chunk of chunks) {
      await this.db.query(
        `INSERT INTO document_chunks (id, document_id, business_id, chunk_index, content, embedding, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::vector, $7)`,
        [
          chunk.id,
          chunk.documentId,
          chunk.businessId,
          chunk.chunkIndex,
          chunk.content,
          embeddingToVectorLiteral(chunk.embedding),
          chunk.createdAt,
        ],
      );
    }
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.db.query(`DELETE FROM document_chunks WHERE document_id = $1`, [documentId]);
  }

  async searchSimilar(businessId: string, queryEmbedding: number[], limit: number): Promise<SimilarChunk[]> {
    // `<=>` es distancia coseno en pgvector (0 = idéntico); la convertimos a
    // similitud para que quien consuma esto no tenga que conocer el operador.
    const result = await this.db.query<DocumentChunkRow & { similarity: number }>(
      `SELECT *, 1 - (embedding <=> $2::vector) AS similarity
       FROM document_chunks
       WHERE business_id = $1
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      [businessId, embeddingToVectorLiteral(queryEmbedding), limit],
    );

    return result.rows.map((row) => ({
      chunk: DocumentChunkFactory.toDomain(row),
      similarity: Number(row.similarity),
    }));
  }
}
