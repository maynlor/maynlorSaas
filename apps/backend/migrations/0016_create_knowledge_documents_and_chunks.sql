-- Documentos libres (texto pegado o extraído de un PDF) que alimentan el RAG
-- del AI Engine, complementando las FAQ estructuradas de pregunta/respuesta.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  title VARCHAR(200) NOT NULL,
  source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('text', 'pdf')),
  -- Nombre del archivo original cuando source_type = 'pdf'; NULL para texto pegado.
  source_filename VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_knowledge_documents_business_id ON knowledge_documents (business_id)
  WHERE deleted_at IS NULL;

-- Fragmentos del documento (chunking de tamaño fijo con solapamiento) con su
-- embedding. text-embedding-3-small de OpenAI produce vectores de 1536
-- dimensiones; cambiar de modelo de embeddings implica una migración nueva.
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_chunks_document_id ON document_chunks (document_id);

-- HNSW + vector_cosine_ops: los embeddings de OpenAI están normalizados, así
-- que similitud coseno es la métrica estándar para este modelo.
CREATE INDEX idx_document_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops);
