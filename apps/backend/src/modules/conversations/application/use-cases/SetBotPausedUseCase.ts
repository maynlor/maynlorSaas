import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import type { IConversationRepository } from "../repositories/IConversationRepository.js";

export interface SetBotPausedOutputDTO {
  conversationId: string;
  botPaused: boolean;
  botPausedAt: string | null;
}

/**
 * Devuelve la conversación al bot, o la toma manualmente sin escribir todavía.
 */
export class SetBotPausedUseCase {
  constructor(private readonly conversationRepository: IConversationRepository) {}

  async execute(
    businessId: string,
    conversationId: string,
    paused: boolean,
  ): Promise<Result<SetBotPausedOutputDTO, AppError>> {
    const conversation = await this.conversationRepository.findById(businessId, conversationId);
    if (!conversation) {
      return Result.fail(new NotFoundError("Conversation not found"));
    }

    if (paused) {
      conversation.pauseBot();
    } else {
      conversation.resumeBot();
    }
    await this.conversationRepository.save(conversation);

    return Result.ok({
      conversationId: conversation.id,
      botPaused: conversation.isBotPaused,
      botPausedAt: conversation.botPausedAt?.toISOString() ?? null,
    });
  }
}
