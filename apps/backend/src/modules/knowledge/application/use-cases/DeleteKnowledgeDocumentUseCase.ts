import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IKnowledgeDocumentRepository } from "../repositories/IKnowledgeDocumentRepository.js";
import type { IDocumentChunkRepository } from "../repositories/IDocumentChunkRepository.js";

export class DeleteKnowledgeDocumentUseCase {
  constructor(
    private readonly documentRepository: IKnowledgeDocumentRepository,
    private readonly chunkRepository: IDocumentChunkRepository,
  ) {}

  async execute(businessId: string, id: string): Promise<Result<void, AppError>> {
    const document = await this.documentRepository.findById(businessId, id);
    if (!document) {
      return Result.fail(new NotFoundError("Knowledge document not found"));
    }

    document.delete();
    await this.documentRepository.save(document);
    // Los fragmentos no necesitan conservarse tras el borrado del documento
    // (a diferencia del documento, que queda soft-deleted para auditoría);
    // se eliminan de una para no dejar vectores huérfanos ocupando el índice.
    await this.chunkRepository.deleteByDocumentId(document.id);

    return Result.ok(undefined);
  }
}
