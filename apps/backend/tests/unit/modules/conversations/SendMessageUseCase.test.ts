import { describe, it, expect, vi } from "vitest";
import { SendMessageUseCase } from "@modules/conversations/application/use-cases/SendMessageUseCase.js";
import { Conversation } from "@modules/conversations/domain/Conversation.js";
import { Message } from "@modules/conversations/domain/Message.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { Client } from "@modules/clients/domain/Client.js";
import type { IBusinessRepository } from "@modules/businesses/application/repositories/IBusinessRepository.js";
import type { IClientRepository } from "@modules/clients/application/repositories/IClientRepository.js";
import type { IConversationRepository } from "@modules/conversations/application/repositories/IConversationRepository.js";
import type { IMessageRepository } from "@modules/conversations/application/repositories/IMessageRepository.js";
import type { AIProvider } from "@modules/ai/application/providers/AIProvider.js";
import type { PlanLimitReader } from "@modules/subscriptions/application/services/PlanLimitReader.js";
import {
  NotFoundError,
  ValidationError,
  InfrastructureError,
  PlanLimitExceededError,
} from "@shared/errors/AppError.js";
import type { ProductTracker } from "@shared/telemetry/ProductTracker.js";

const businessId = "b1";

function buildBusiness() {
  return Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
}

function buildClient() {
  return Client.create({ businessId, name: "Juan" }).value;
}

function mocks() {
  const businessRepository: IBusinessRepository = {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(buildBusiness()),
    findBySlug: vi.fn(),
    findByWhatsAppPhoneNumberId: vi.fn(),
    findAll: vi.fn(),
    existsByEmailOrSlug: vi.fn(),
  };
  const clientRepository: IClientRepository = {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(buildClient()),
    findAll: vi.fn(),
    existsByPhone: vi.fn(),
    findByPhone: vi.fn(),
  };
  const conversationRepository: IConversationRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findAll: vi.fn(),
    findLatestByClientAndChannel: vi.fn().mockResolvedValue(null),
    countCreatedSince: vi.fn().mockResolvedValue(0),
  };
  const messageRepository: IMessageRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findByConversationId: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    findRecentByConversationId: vi.fn().mockResolvedValue([]),
  };
  const aiProvider: AIProvider = {
    generateText: vi.fn().mockResolvedValue({ text: "¡Hola! ¿En qué puedo ayudarte?" }),
    transcribeAudio: vi.fn().mockResolvedValue(""),
    embedText: vi.fn().mockResolvedValue([]),
    describeImage: vi.fn().mockResolvedValue(""),
  };
  const planLimitReader = {
    getLimit: vi.fn().mockResolvedValue(null),
  } as unknown as PlanLimitReader;
  return {
    businessRepository,
    clientRepository,
    conversationRepository,
    messageRepository,
    aiProvider,
    planLimitReader,
  };
}

describe("SendMessageUseCase", () => {
  it("starts a new conversation when clientId is given and no conversationId", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    const result = await useCase.execute(businessId, { message: "Hola", clientId: "c1" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.reply).toBe("¡Hola! ¿En qué puedo ayudarte?");
    expect(conversationRepository.save).toHaveBeenCalledOnce();
    expect(messageRepository.save).toHaveBeenCalledTimes(2);
  });

  it("tracks message_sent on the product tracker after a successful reply", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    const tracker: ProductTracker = { track: vi.fn(), identify: vi.fn() };
    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
      undefined,
      tracker,
    );

    await useCase.execute(businessId, { message: "Hola", clientId: "c1", channel: "whatsapp" });

    expect(tracker.track).toHaveBeenCalledWith(
      businessId,
      "message_sent",
      expect.objectContaining({ channel: "whatsapp" }),
    );
  });

  it("propagates quickReplies from the AI provider when present", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    aiProvider.generateText = vi
      .fn()
      .mockResolvedValue({ text: "¿Cuál preferís?", quickReplies: ["Rojo", "Azul"] });
    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    const result = await useCase.execute(businessId, { message: "Hola", clientId: "c1" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.reply).toBe("¿Cuál preferís?");
    expect(result.value.quickReplies).toEqual(["Rojo", "Azul"]);
  });

  it("continues an existing conversation, sending prior history to the provider", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    const conversation = Conversation.create({ businessId, clientId: "c1" });
    conversationRepository.findById = vi.fn().mockResolvedValue(conversation);
    const priorMessage = Message.create({
      conversationId: conversation.id,
      businessId,
      role: "user",
      content: "Mensaje anterior",
    });
    messageRepository.findRecentByConversationId = vi.fn().mockResolvedValue([priorMessage]);

    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    const result = await useCase.execute(businessId, {
      message: "Segundo mensaje",
      conversationId: conversation.id,
    });

    expect(result.isSuccess).toBe(true);
    expect(conversationRepository.save).not.toHaveBeenCalled();
    expect(aiProvider.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "user", content: "Mensaje anterior" },
          { role: "user", content: "Segundo mensaje" },
        ],
      }),
    );
  });

  it("asks for a bounded window of recent history, not the whole conversation", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    const conversation = Conversation.create({ businessId, clientId: "c1" });
    conversationRepository.findById = vi.fn().mockResolvedValue(conversation);

    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    await useCase.execute(businessId, {
      message: "Hola",
      conversationId: conversation.id,
    });

    // En WhatsApp la conversación no se cierra nunca. Mandar el historial
    // entero hacía que el costo creciera con el cuadrado de su largo, y al
    // pasar los 1000 mensajes la paginación desde el principio le daba al
    // modelo los más viejos y ninguno de los recientes.
    expect(messageRepository.findByConversationId).not.toHaveBeenCalled();
    expect(messageRepository.findRecentByConversationId).toHaveBeenCalledWith(
      businessId,
      conversation.id,
      expect.any(Number),
    );
    const limit = vi.mocked(messageRepository.findRecentByConversationId).mock.calls[0]?.[2];
    expect(limit).toBeGreaterThan(0);
    expect(limit).toBeLessThanOrEqual(100);
  });

  it("fails with ValidationError when neither conversationId nor clientId are given", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    const result = await useCase.execute(businessId, { message: "Hola" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it("fails with NotFoundError when conversationId does not exist", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    conversationRepository.findById = vi.fn().mockResolvedValue(null);

    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    const result = await useCase.execute(businessId, {
      message: "Hola",
      conversationId: "00000000-0000-0000-0000-000000000000",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it("fails with NotFoundError when clientId does not exist", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    clientRepository.findById = vi.fn().mockResolvedValue(null);

    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    const result = await useCase.execute(businessId, {
      message: "Hola",
      clientId: "00000000-0000-0000-0000-000000000000",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it("fails with InfrastructureError when the AI provider throws", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    aiProvider.generateText = vi.fn().mockRejectedValue(new Error("network down"));

    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    const result = await useCase.execute(businessId, { message: "Hola", clientId: "c1" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
  });

  it("fails with PlanLimitExceededError when the monthly conversation quota is reached", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    planLimitReader.getLimit = vi.fn().mockResolvedValue(5);
    conversationRepository.countCreatedSince = vi.fn().mockResolvedValue(5);
    const tracker: ProductTracker = { track: vi.fn(), identify: vi.fn() };

    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
      undefined,
      tracker,
    );

    const result = await useCase.execute(businessId, { message: "Hola", clientId: "c1" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(PlanLimitExceededError);
    expect(conversationRepository.save).not.toHaveBeenCalled();
    expect(tracker.track).toHaveBeenCalledWith(
      businessId,
      "plan_limit_exceeded",
      expect.objectContaining({ limitType: "conversations" }),
    );
  });

  it("does not check the conversation quota when continuing an existing conversation", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    } = mocks();
    const conversation = Conversation.create({ businessId, clientId: "c1" });
    conversationRepository.findById = vi.fn().mockResolvedValue(conversation);

    const useCase = new SendMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      messageRepository,
      aiProvider,
      planLimitReader,
    );

    const result = await useCase.execute(businessId, {
      message: "Hola de nuevo",
      conversationId: conversation.id,
    });

    expect(result.isSuccess).toBe(true);
    expect(planLimitReader.getLimit).not.toHaveBeenCalled();
  });
});
