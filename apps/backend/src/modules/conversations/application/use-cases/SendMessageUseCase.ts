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

/**
 * Cuántos mensajes previos se le mandan al modelo como contexto.
 *
 * Mandar la conversación entera hacía que el costo creciera con el cuadrado de
 * su largo: en un canal como WhatsApp la conversación no se cierra nunca, así
 * que en el mensaje 300 se pagaban 300 mensajes de contexto para generar una
 * línea de respuesta. Lo que quede fuera de la ventana no se pierde: para eso
 * están las herramientas `guardar_memoria` / `buscar_memoria`, que guardan lo
 * que vale la pena recordar en vez de arrastrar todo.
 */
const HISTORY_WINDOW = 40;

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

    const history = await this.messageRepository.findRecentByConversationId(
      businessId,
      conversation.id,
      HISTORY_WINDOW,
    );

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
      ...history.map((m) => ({ role: m.role, content: m.content })),
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
    } catch (err) {
      // La causa se adjunta en vez de descartarse: el proveedor ya explica si
      // fue cuota agotada, clave inválida o modelo inexistente, y ese detalle
      // es la diferencia entre un log accionable y uno inútil. Viaja en
      // `cause`, así que no se filtra en la respuesta HTTP.
      return Result.fail(
        new InfrastructureError("AI provider request failed", undefined, { cause: err }),
      );
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
