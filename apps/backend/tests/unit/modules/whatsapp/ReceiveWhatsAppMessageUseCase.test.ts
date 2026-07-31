import { describe, it, expect, vi } from "vitest";
import {
  InfrastructureError,
  PlanLimitExceededError,
} from "@shared/errors/AppError.js";
import { ReceiveWhatsAppMessageUseCase } from "@modules/whatsapp/application/use-cases/ReceiveWhatsAppMessageUseCase.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { Client } from "@modules/clients/domain/Client.js";
import { Conversation } from "@modules/conversations/domain/Conversation.js";
import { Result } from "@shared/result/Result.js";
import type { IBusinessRepository } from "@modules/businesses/application/repositories/IBusinessRepository.js";
import type { IClientRepository } from "@modules/clients/application/repositories/IClientRepository.js";
import type { IConversationRepository } from "@modules/conversations/application/repositories/IConversationRepository.js";
import type { SendMessageUseCase } from "@modules/conversations/application/use-cases/SendMessageUseCase.js";
import type { WhatsAppClient } from "@modules/whatsapp/application/providers/WhatsAppClient.js";
import type { AIProvider } from "@modules/ai/application/providers/AIProvider.js";
import type { IInboundMessageRepository } from "@modules/whatsapp/application/repositories/IInboundMessageRepository.js";
import type { ILogger } from "@shared/logger/Logger.js";

function buildBusiness() {
  return Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
}

function buildClient(businessId: string) {
  return Client.create({ businessId, name: "Juan", phone: "+5491100000000" }).value;
}

const noopLogger: ILogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

function mocks() {
  const business = buildBusiness();
  const businessRepository: IBusinessRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    findByWhatsAppPhoneNumberId: vi.fn().mockResolvedValue(business),
    findAll: vi.fn(),
    existsByEmailOrSlug: vi.fn(),
  };
  const clientRepository: IClientRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findAll: vi.fn(),
    existsByPhone: vi.fn(),
    findByPhone: vi.fn().mockResolvedValue(null),
  };
  const conversationRepository: IConversationRepository = {
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findLatestByClientAndChannel: vi.fn().mockResolvedValue(null),
    countCreatedSince: vi.fn().mockResolvedValue(0),
  };
  const sendMessageUseCase = {
    execute: vi.fn().mockResolvedValue(Result.ok({ conversationId: "conv-1", reply: "¡Hola!" })),
  } as unknown as SendMessageUseCase;
  const whatsAppClient: WhatsAppClient = {
    sendTextMessage: vi.fn().mockResolvedValue(undefined),
    sendButtonsMessage: vi.fn().mockResolvedValue(undefined),
    downloadMedia: vi
      .fn()
      .mockResolvedValue({ buffer: Buffer.from("audio-bytes"), mimeType: "audio/ogg" }),
  };
  const inboundMessageRepository: IInboundMessageRepository = {
    claim: vi.fn().mockResolvedValue(true),
    markCompleted: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
  };
  const aiProvider: AIProvider = {
    generateText: vi.fn(),
    transcribeAudio: vi.fn().mockResolvedValue("Quiero saber el horario"),
    embedText: vi.fn().mockResolvedValue([]),
    describeImage: vi.fn().mockResolvedValue("Una remera azul con estampado floral"),
  };

  return {
    business,
    businessRepository,
    clientRepository,
    conversationRepository,
    sendMessageUseCase,
    whatsAppClient,
    aiProvider,
    inboundMessageRepository,
  };
}

describe("ReceiveWhatsAppMessageUseCase", () => {
  it("does nothing when the phone_number_id is not linked to any business", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();
    businessRepository.findByWhatsAppPhoneNumberId = vi.fn().mockResolvedValue(null);

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({ externalId: `wamid.${crypto.randomUUID()}`, phoneNumberId: "unknown", fromPhone: "+549111", messageText: "Hola" });

    expect(clientRepository.findByPhone).not.toHaveBeenCalled();
    expect(sendMessageUseCase.execute).not.toHaveBeenCalled();
    expect(whatsAppClient.sendTextMessage).not.toHaveBeenCalled();
  });

  it("auto-creates a client and starts a new conversation on the first message", async () => {
    const {
      business,
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({
      externalId: `wamid.${crypto.randomUUID()}`,
      phoneNumberId: "pn-1",
      fromPhone: "+5491100000000",
      messageText: "Hola",
      contactName: "Juan",
    });

    expect(clientRepository.save).toHaveBeenCalledOnce();
    expect(sendMessageUseCase.execute).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({ message: "Hola", conversationId: undefined, channel: "whatsapp" }),
    );
    expect(whatsAppClient.sendTextMessage).toHaveBeenCalledWith("pn-1", "+5491100000000", "¡Hola!");
  });

  it("sends interactive buttons instead of plain text when the reply includes quickReplies", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();
    const sendMessageUseCase = {
      execute: vi.fn().mockResolvedValue(
        Result.ok({ conversationId: "conv-1", reply: "¿Cuál preferís?", quickReplies: ["Rojo", "Azul"] }),
      ),
    } as unknown as SendMessageUseCase;

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({
      externalId: `wamid.${crypto.randomUUID()}`,
      phoneNumberId: "pn-1",
      fromPhone: "+5491100000000",
      messageText: "Hola",
      contactName: "Juan",
    });

    expect(whatsAppClient.sendTextMessage).not.toHaveBeenCalled();
    expect(whatsAppClient.sendButtonsMessage).toHaveBeenCalledWith(
      "pn-1",
      "+5491100000000",
      "¿Cuál preferís?",
      [
        { id: "opcion_1", title: "Rojo" },
        { id: "opcion_2", title: "Azul" },
      ],
    );
  });

  it("reuses the existing client and conversation on subsequent messages", async () => {
    const {
      business,
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();
    const client = buildClient(business.id);
    clientRepository.findByPhone = vi.fn().mockResolvedValue(client);
    const conversation = Conversation.create({
      businessId: business.id,
      clientId: client.id,
      channel: "whatsapp",
    });
    conversationRepository.findLatestByClientAndChannel = vi.fn().mockResolvedValue(conversation);

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({
      externalId: `wamid.${crypto.randomUUID()}`,
      phoneNumberId: "pn-1",
      fromPhone: "+5491100000000",
      messageText: "¿Tienen stock?",
    });

    expect(clientRepository.save).not.toHaveBeenCalled();
    expect(sendMessageUseCase.execute).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({ conversationId: conversation.id, clientId: undefined }),
    );
  });

  it("does not call WhatsAppClient when SendMessageUseCase fails", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();
    sendMessageUseCase.execute = vi
      .fn()
      .mockResolvedValue(Result.fail(new Error("boom") as never));

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({ externalId: `wamid.${crypto.randomUUID()}`, phoneNumberId: "pn-1", fromPhone: "+5491100000000", messageText: "Hola" });

    expect(whatsAppClient.sendTextMessage).not.toHaveBeenCalled();
  });

  it("does not throw when sending the WhatsApp reply fails", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();
    whatsAppClient.sendTextMessage = vi.fn().mockRejectedValue(new Error("network down"));

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await expect(
      useCase.execute({ externalId: `wamid.${crypto.randomUUID()}`, phoneNumberId: "pn-1", fromPhone: "+5491100000000", messageText: "Hola" }),
    ).resolves.toBeUndefined();
  });

  it("transcribes an incoming audio message and uses the transcript as the message text", async () => {
    const {
      business,
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({
      externalId: `wamid.${crypto.randomUUID()}`,
      phoneNumberId: "pn-1",
      fromPhone: "+5491100000000",
      media: { type: "audio", mediaId: "media-1" },
    });

    expect(whatsAppClient.downloadMedia).toHaveBeenCalledWith("media-1");
    expect(aiProvider.transcribeAudio).toHaveBeenCalledWith(Buffer.from("audio-bytes"), "audio/ogg");
    expect(sendMessageUseCase.execute).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({ message: "Quiero saber el horario" }),
    );
  });

  it("describes the image with vision and includes the caption when present", async () => {
    const {
      business,
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({
      externalId: `wamid.${crypto.randomUUID()}`,
      phoneNumberId: "pn-1",
      fromPhone: "+5491100000000",
      media: { type: "image", mediaId: "media-2", caption: "¿Tienen esta remera?" },
    });

    expect(whatsAppClient.downloadMedia).toHaveBeenCalledWith("media-2");
    expect(aiProvider.describeImage).toHaveBeenCalledWith(Buffer.from("audio-bytes"), "audio/ogg");
    expect(sendMessageUseCase.execute).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({
        message: expect.stringContaining("¿Tienen esta remera?"),
      }),
    );
    expect(sendMessageUseCase.execute).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({
        message: expect.stringContaining("Una remera azul con estampado floral"),
      }),
    );
  });

  it("describes an image with no caption using vision alone", async () => {
    const {
      business,
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();
    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({
      externalId: `wamid.${crypto.randomUUID()}`,
      phoneNumberId: "pn-1",
      fromPhone: "+5491100000000",
      media: { type: "image", mediaId: "media-3" },
    });

    expect(sendMessageUseCase.execute).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({ message: expect.stringContaining("Una remera azul con estampado floral") }),
    );
  });

  it("falls back to a caption-only message when describing the image fails", async () => {
    const {
      business,
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();
    vi.mocked(aiProvider.describeImage).mockRejectedValue(new Error("OpenAI vision request failed"));

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({
      externalId: `wamid.${crypto.randomUUID()}`,
      phoneNumberId: "pn-1",
      fromPhone: "+5491100000000",
      media: { type: "image", mediaId: "media-4", caption: "¿Tienen esta remera?" },
    });

    expect(sendMessageUseCase.execute).toHaveBeenCalledWith(
      business.id,
      expect.objectContaining({ message: expect.stringContaining("¿Tienen esta remera?") }),
    );
  });

  it("logs and does nothing when neither text nor media is present", async () => {
    const {
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
    } = mocks();

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      aiProvider,
      inboundMessageRepository,
      noopLogger,
    );

    await useCase.execute({ externalId: `wamid.${crypto.randomUUID()}`, phoneNumberId: "pn-1", fromPhone: "+5491100000000" });

    expect(sendMessageUseCase.execute).not.toHaveBeenCalled();
  });

  describe("deduplication", () => {
    function build(overrides: Partial<ReturnType<typeof mocks>> = {}) {
      const m = { ...mocks(), ...overrides };
      const useCase = new ReceiveWhatsAppMessageUseCase(
        m.businessRepository,
        m.clientRepository,
        m.conversationRepository,
        m.sendMessageUseCase,
        m.whatsAppClient,
        m.aiProvider,
        m.inboundMessageRepository,
        noopLogger,
      );
      return { ...m, useCase };
    }

    it("does no work at all when the message was already claimed", async () => {
      const { useCase, inboundMessageRepository, sendMessageUseCase, whatsAppClient } = build();
      inboundMessageRepository.claim = vi.fn().mockResolvedValue(false);

      await useCase.execute({
        externalId: "wamid.dup",
        phoneNumberId: "pn-1",
        fromPhone: "+5491100000000",
        messageText: "Hola",
      });

      expect(sendMessageUseCase.execute).not.toHaveBeenCalled();
      expect(whatsAppClient.sendTextMessage).not.toHaveBeenCalled();
      expect(inboundMessageRepository.markCompleted).not.toHaveBeenCalled();
      expect(inboundMessageRepository.markFailed).not.toHaveBeenCalled();
    });

    it("marks the message completed once the reply was sent", async () => {
      const { useCase, inboundMessageRepository } = build();

      await useCase.execute({
        externalId: "wamid.ok",
        phoneNumberId: "pn-1",
        fromPhone: "+5491100000000",
        messageText: "Hola",
      });

      expect(inboundMessageRepository.markCompleted).toHaveBeenCalledWith("wamid.ok");
      expect(inboundMessageRepository.markFailed).not.toHaveBeenCalled();
    });

    it("marks the message failed when generating the reply fails, so Meta's retry can reprocess it", async () => {
      const sendMessageUseCase = {
        execute: vi.fn().mockResolvedValue(Result.fail(new InfrastructureError("AI down"))),
      } as unknown as SendMessageUseCase;
      const { useCase, inboundMessageRepository } = build({ sendMessageUseCase });

      await useCase.execute({
        externalId: "wamid.transient",
        phoneNumberId: "pn-1",
        fromPhone: "+5491100000000",
        messageText: "Hola",
      });

      expect(inboundMessageRepository.markFailed).toHaveBeenCalledWith("wamid.transient");
      expect(inboundMessageRepository.markCompleted).not.toHaveBeenCalled();
    });

    it("marks the message completed when the plan limit was hit, since retrying cannot help", async () => {
      const sendMessageUseCase = {
        execute: vi.fn().mockResolvedValue(Result.fail(new PlanLimitExceededError("no quota"))),
      } as unknown as SendMessageUseCase;
      const { useCase, inboundMessageRepository } = build({ sendMessageUseCase });

      await useCase.execute({
        externalId: "wamid.overquota",
        phoneNumberId: "pn-1",
        fromPhone: "+5491100000000",
        messageText: "Hola",
      });

      expect(inboundMessageRepository.markCompleted).toHaveBeenCalledWith("wamid.overquota");
      expect(inboundMessageRepository.markFailed).not.toHaveBeenCalled();
    });

    it("marks the message failed when an unexpected error escapes, instead of leaving it stuck", async () => {
      const { useCase, inboundMessageRepository, businessRepository } = build();
      businessRepository.findByWhatsAppPhoneNumberId = vi
        .fn()
        .mockRejectedValue(new Error("database unreachable"));

      await useCase.execute({
        externalId: "wamid.boom",
        phoneNumberId: "pn-1",
        fromPhone: "+5491100000000",
        messageText: "Hola",
      });

      expect(inboundMessageRepository.markFailed).toHaveBeenCalledWith("wamid.boom");
    });
  });
});
