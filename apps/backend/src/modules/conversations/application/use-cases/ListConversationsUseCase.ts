import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import type { IConversationRepository } from "../repositories/IConversationRepository.js";
import type { ListConversationsOutputDTO } from "../dtos/ConversationDTO.js";
import { ConversationMapper } from "../mappers/ConversationMapper.js";

export interface ListConversationsQuery {
  page: number;
  pageSize: number;
}

export class ListConversationsUseCase {
  constructor(private readonly repository: IConversationRepository) {}

  async execute(
    businessId: string,
    query: ListConversationsQuery,
  ): Promise<Result<ListConversationsOutputDTO, AppError>> {
    const limit = query.pageSize;
    const offset = (query.page - 1) * query.pageSize;

    const { items, total } = await this.repository.findAll(businessId, { limit, offset });

    return Result.ok({
      items: items.map(ConversationMapper.toDTO),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
