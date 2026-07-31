import { DocumentChunk } from "../../domain/DocumentChunk.js";

export interface DocumentChunkRow {
  id: string;
  document_id: string;
  business_id: string;
  chunk_index: number;
  content: string;
  // pgvector: node-postgres no conoce el tipo `vector`, así que vuelve como
  // texto en formato "[0.1,0.2,...]" — que resulta ser JSON válido.
  embedding: string;
  created_at: Date;
}

/** Serializa un embedding al formato de texto que pgvector acepta para castear a `vector`. */
export function embeddingToVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export class DocumentChunkFactory {
  static toDomain(row: DocumentChunkRow): DocumentChunk {
    return DocumentChunk.reconstitute({
      id: row.id,
      documentId: row.document_id,
      businessId: row.business_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      embedding: JSON.parse(row.embedding) as number[],
      createdAt: row.created_at,
    });
  }
}
