import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import type { IKnowledgeDocumentRepository } from "../repositories/IKnowledgeDocumentRepository.js";
import type { ListKnowledgeDocumentsOutputDTO } from "../dtos/KnowledgeDocumentDTO.js";
import { KnowledgeDocumentMapper } from "../mappers/KnowledgeDocumentMapper.js";

export class ListKnowledgeDocumentsUseCase {
  constructor(private readonly repository: IKnowledgeDocumentRepository) {}

  async execute(
    businessId: string,
    input: { page: number; pageSize: number },
  ): Promise<Result<ListKnowledgeDocumentsOutputDTO, AppError>> {
    const limit = input.pageSize;
    const offset = (input.page - 1) * input.pageSize;

    const { items, total } = await this.repository.findAll(businessId, { limit, offset });

    return Result.ok({
      items: items.map((document) => KnowledgeDocumentMapper.toDTO(document)),
      total,
      page: input.page,
      pageSize: input.pageSize,
    });
  }
}
