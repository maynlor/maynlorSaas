import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IConversationRepository } from "../repositories/IConversationRepository.js";
import type { IMessageRepository } from "../repositories/IMessageRepository.js";
import type { ListMessagesOutputDTO } from "../dtos/MessageDTO.js";
import { MessageMapper } from "../mappers/MessageMapper.js";

export interface GetConversationMessagesQuery {
  page: number;
  pageSize: number;
}

export class GetConversationMessagesUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository,
  ) {}

  async execute(
    businessId: string,
    conversationId: string,
    query: GetConversationMessagesQuery,
  ): Promise<Result<ListMessagesOutputDTO, AppError>> {
    const conversation = await this.conversationRepository.findById(businessId, conversationId);
    if (!conversation) {
      return Result.fail(new NotFoundError("Conversation not found"));
    }

    const limit = query.pageSize;
    const offset = (query.page - 1) * query.pageSize;

    const { items, total } = await this.messageRepository.findByConversationId(
      businessId,
      conversationId,
      { limit, offset },
    );

    return Result.ok({
      items: items.map(MessageMapper.toDTO),
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
