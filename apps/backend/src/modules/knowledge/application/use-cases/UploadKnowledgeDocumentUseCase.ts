import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { AIProviderError, PlanLimitExceededError } from "../../../../shared/errors/AppError.js";
import { KnowledgeDocument } from "../../domain/KnowledgeDocument.js";
import { DocumentChunk } from "../../domain/DocumentChunk.js";
import { EmptyKnowledgeDocumentContentError } from "../../domain/errors/KnowledgeDocumentDomainErrors.js";
import { TextChunker } from "../services/TextChunker.js";
import type { IKnowledgeDocumentRepository } from "../repositories/IKnowledgeDocumentRepository.js";
import type { IDocumentChunkRepository } from "../repositories/IDocumentChunkRepository.js";
import type { IPdfTextExtractor } from "../services/IPdfTextExtractor.js";
import type { PlanLimitReader } from "../../../subscriptions/application/services/PlanLimitReader.js";
import type { AIProvider } from "../../../ai/application/providers/AIProvider.js";
import type { KnowledgeDocumentOutputDTO, UploadKnowledgeDocumentInputDTO } from "../dtos/KnowledgeDocumentDTO.js";
import { KnowledgeDocumentMapper } from "../mappers/KnowledgeDocumentMapper.js";

export class UploadKnowledgeDocumentUseCase {
  constructor(
    private readonly documentRepository: IKnowledgeDocumentRepository,
    private readonly chunkRepository: IDocumentChunkRepository,
    private readonly planLimitReader: PlanLimitReader,
    private readonly aiProvider: AIProvider,
    private readonly pdfTextExtractor: IPdfTextExtractor,
  ) {}

  async execute(
    businessId: string,
    input: UploadKnowledgeDocumentInputDTO,
  ): Promise<Result<KnowledgeDocumentOutputDTO, AppError>> {
    const maxDocuments = await this.planLimitReader.getLimit(businessId, "knowledgeDocuments");
    if (maxDocuments !== null) {
      const currentCount = await this.documentRepository.countByBusinessId(businessId);
      if (currentCount >= maxDocuments) {
        return Result.fail(
          new PlanLimitExceededError(
            `Knowledge document limit reached for the current plan (${maxDocuments}). Upgrade your plan to add more.`,
          ),
        );
      }
    }

    let rawText: string;
    try {
      rawText =
        input.sourceType === "text" ? input.content : await this.pdfTextExtractor.extractText(input.file.buffer);
    } catch (err) {
      return Result.fail(
        new AIProviderError(err instanceof Error ? err.message : "Failed to extract text from the file"),
      );
    }

    if (rawText.trim().length === 0) {
      return Result.fail(new EmptyKnowledgeDocumentContentError());
    }

    const documentResult = KnowledgeDocument.create({
      businessId,
      title: input.title,
      sourceType: input.sourceType,
      sourceFilename: input.sourceType === "pdf" ? input.file.filename : null,
    });
    if (documentResult.isFailure) {
      return Result.fail(documentResult.error);
    }
    const document = documentResult.value;
    await this.documentRepository.save(document);

    const pieces = TextChunker.chunk(rawText);
    let chunks;
    try {
      chunks = await Promise.all(
        pieces.map(async (content, chunkIndex) => {
          const embedding = await this.aiProvider.embedText(content);
          return DocumentChunk.create({ documentId: document.id, businessId, chunkIndex, content, embedding });
        }),
      );
    } catch (err) {
      // El documento ya se guardó; sin sus fragmentos quedaría "cargado" pero
      // invisible para buscar_documentos, lo que confundiría al negocio más
      // que un error claro de que la carga falló.
      document.delete();
      await this.documentRepository.save(document);
      return Result.fail(
        new AIProviderError(err instanceof Error ? err.message : "Failed to generate embeddings"),
      );
    }
    await this.chunkRepository.saveMany(chunks);

    return Result.ok(KnowledgeDocumentMapper.toDTO(document));
  }
}
