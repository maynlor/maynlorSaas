import { Result } from "../../../shared/result/Result.js";
import type { DomainError } from "../../../shared/errors/AppError.js";
import { KnowledgeDocumentTitle } from "./value-objects/KnowledgeDocumentTitle.js";

export type KnowledgeDocumentSourceType = "text" | "pdf";

export interface KnowledgeDocumentProps {
  id: string;
  businessId: string;
  title: KnowledgeDocumentTitle;
  sourceType: KnowledgeDocumentSourceType;
  sourceFilename: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface KnowledgeDocumentPersistenceProps {
  id: string;
  businessId: string;
  title: string;
  sourceType: KnowledgeDocumentSourceType;
  sourceFilename: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Documento libre (texto pegado o extraído de un PDF) que alimenta el RAG.
 * El contenido en sí no vive acá: se parte en `DocumentChunk`s con su propio
 * embedding, que es la unidad real de búsqueda semántica.
 */
export class KnowledgeDocument {
  private constructor(private props: KnowledgeDocumentProps) {}

  static create(input: {
    businessId: string;
    title: string;
    sourceType: KnowledgeDocumentSourceType;
    sourceFilename?: string | null;
  }): Result<KnowledgeDocument, DomainError> {
    const titleResult = KnowledgeDocumentTitle.create(input.title);
    if (titleResult.isFailure) return Result.fail(titleResult.error);

    const now = new Date();
    return Result.ok(
      new KnowledgeDocument({
        id: crypto.randomUUID(),
        businessId: input.businessId,
        title: titleResult.value,
        sourceType: input.sourceType,
        sourceFilename: input.sourceFilename ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }),
    );
  }

  static reconstitute(row: KnowledgeDocumentPersistenceProps): KnowledgeDocument {
    return new KnowledgeDocument({
      id: row.id,
      businessId: row.businessId,
      title: KnowledgeDocumentTitle.create(row.title).value,
      sourceType: row.sourceType,
      sourceFilename: row.sourceFilename,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    });
  }

  delete(): void {
    const now = new Date();
    this.props = { ...this.props, deletedAt: now, updatedAt: now };
  }

  get id(): string {
    return this.props.id;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get title(): string {
    return this.props.title.toString();
  }

  get sourceType(): KnowledgeDocumentSourceType {
    return this.props.sourceType;
  }

  get sourceFilename(): string | null {
    return this.props.sourceFilename;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }
}
