import { Result } from "../../../../shared/result/Result.js";
import { startOfCurrentMonth } from "../../../../shared/date/startOfCurrentMonth.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import {
  InfrastructureError,
  NotFoundError,
  PlanLimitExceededError,
  ValidationError,
} from "../../../../shared/errors/AppError.js";
import type { IBusinessRepository } from "../../../businesses/application/repositories/IBusinessRepository.js";
import type { IClientRepository } from "../../../clients/application/repositories/IClientRepository.js";
import type { AIProvider, ChatMessage } from "../../../ai/application/providers/AIProvider.js";
import type { AITool } from "../../../ai/application/tools/AITool.js";
import { PromptEngine } from "../../../ai/application/services/PromptEngine.js";
import type { PlanLimitReader } from "../../../subscriptions/application/services/PlanLimitReader.js";
import { Conversation } from "../../domain/Conversation.js";
import { Message } from "../../domain/Message.js";
import type { IConversationRepository } from "../repositories/IConversationRepository.js";
import type { IMessageRepository } from "../repositories/IMessageRepository.js";
import type { SendMessageInputDTO, SendMessageOutputDTO } from "../dtos/SendMessageDTO.js";
import type { ProductTracker } from "../../../../shared/telemetry/ProductTracker.js";
import { NoopProductTracker } from "../../../../shared/telemetry/NoopProductTracker.js";

const HISTORY_LIMIT = 1000;

export type AIToolsFactory = (businessId: string, clientId: string) => AITool[];

export class SendMessageUseCase {
  constructor(
    private readonly businessRepository: IBusinessRepository,
    private readonly clientRepository: IClientRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly aiProvider: AIProvider,
    private readonly planLimitReader: PlanLimitReader,
    private readonly buildTools?: AIToolsFactory,
    private readonly tracker: ProductTracker = new NoopProductTracker(),
  ) {}

  async execute(
    businessId: string,
    input: SendMessageInputDTO,
  ): Promise<Result<SendMessageOutputDTO, AppError>> {
    let conversation: Conversation;

    if (input.conversationId) {
      const existing = await this.conversationRepository.findById(
        businessId,
        input.conversationId,
      );
      if (!existing) {
        return Result.fail(new NotFoundError("Conversation not found"));
      }
      conversation = existing;
    } else {
      if (!input.clientId) {
        return Result.fail(
          new ValidationError("clientId is required to start a new conversation"),
        );
      }
      const client = await this.clientRepository.findById(businessId, input.clientId);
      if (!client) {
        return Result.fail(new NotFoundError("Client not found"));
      }

      const maxConversations = await this.planLimitReader.getLimit(businessId, "conversations");
      if (maxConversations !== null) {
        const currentCount = await this.conversationRepository.countCreatedSince(
          businessId,
          startOfCurrentMonth(),
        );
        if (currentCount >= maxConversations) {
          this.tracker.track(businessId, "plan_limit_exceeded", { limitType: "conversations" });
          return Result.fail(
            new PlanLimitExceededError(
              `Monthly conversation limit reached for the current plan (${maxConversations}). Upgrade your plan to start more conversations.`,
            ),
          );
        }
      }

      conversation = Conversation.create({
        businessId,
        clientId: input.clientId,
        channel: input.channel,
      });
      await this.conversationRepository.save(conversation);
    }

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      return Result.fail(new NotFoundError(`Business ${businessId} not found`));
    }

    const history = await this.messageRepository.findByConversationId(businessId, conversation.id, {
      limit: HISTORY_LIMIT,
      offset: 0,
    });

    const userMessage = Message.create({
      conversationId: conversation.id,
      businessId,
      role: "user",
      content: input.message,
    });
    await this.messageRepository.save(userMessage);

    const tools = this.buildTools?.(businessId, conversation.clientId) ?? [];
    const toolNames = new Set(tools.map((tool) => tool.name));
    const systemPrompt = PromptEngine.buildSystemPrompt(business.name, {
      canSearchProducts: toolNames.has("buscar_productos"),
      canSearchServices: toolNames.has("buscar_servicios"),
      canSearchFaqs: toolNames.has("buscar_faq"),
      canSearchDocuments: toolNames.has("buscar_documentos"),
      canRememberClient: toolNames.has("buscar_memoria"),
    });
    const chatMessages: ChatMessage[] = [
      ...history.items.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: input.message },
    ];

    let reply: string;
    let quickReplies: string[] | undefined;
    try {
      const result = await this.aiProvider.generateText({
        systemPrompt,
        messages: chatMessages,
        ...(tools.length > 0 && { tools }),
      });
      reply = result.text;
      quickReplies = result.quickReplies;
    } catch {
      return Result.fail(new InfrastructureError("AI provider request failed"));
    }

    const assistantMessage = Message.create({
      conversationId: conversation.id,
      businessId,
      role: "assistant",
      content: reply,
    });
    await this.messageRepository.save(assistantMessage);

    this.tracker.track(businessId, "message_sent", { channel: input.channel ?? "unknown" });

    return Result.ok({ conversationId: conversation.id, reply, ...(quickReplies && { quickReplies }) });
  }
}
