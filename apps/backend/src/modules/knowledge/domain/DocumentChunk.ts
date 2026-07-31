export interface DocumentChunkProps {
  id: string;
  documentId: string;
  businessId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  createdAt: Date;
}

export type DocumentChunkPersistenceProps = DocumentChunkProps;

/** Un fragmento de un `KnowledgeDocument` con su embedding: la unidad real de búsqueda semántica. */
export class DocumentChunk {
  private constructor(private readonly props: DocumentChunkProps) {}

  static create(input: {
    documentId: string;
    businessId: string;
    chunkIndex: number;
    content: string;
    embedding: number[];
  }): DocumentChunk {
    return new DocumentChunk({
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date(),
    });
  }

  static reconstitute(row: DocumentChunkPersistenceProps): DocumentChunk {
    return new DocumentChunk({ ...row });
  }

  get id(): string {
    return this.props.id;
  }

  get documentId(): string {
    return this.props.documentId;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get chunkIndex(): number {
    return this.props.chunkIndex;
  }

  get content(): string {
    return this.props.content;
  }

  get embedding(): number[] {
    return this.props.embedding;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
