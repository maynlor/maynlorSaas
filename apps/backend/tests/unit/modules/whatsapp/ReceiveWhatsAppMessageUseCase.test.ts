import { describe, it, expect, vi } from "vitest";
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
  };
  const sendMessageUseCase = {
    execute: vi.fn().mockResolvedValue(Result.ok({ conversationId: "conv-1", reply: "¡Hola!" })),
  } as unknown as SendMessageUseCase;
  const whatsAppClient: WhatsAppClient = {
    sendTextMessage: vi.fn().mockResolvedValue(undefined),
  };

  return { business, businessRepository, clientRepository, conversationRepository, sendMessageUseCase, whatsAppClient };
}

describe("ReceiveWhatsAppMessageUseCase", () => {
  it("does nothing when the phone_number_id is not linked to any business", async () => {
    const { businessRepository, clientRepository, conversationRepository, sendMessageUseCase, whatsAppClient } =
      mocks();
    businessRepository.findByWhatsAppPhoneNumberId = vi.fn().mockResolvedValue(null);

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      noopLogger,
    );

    await useCase.execute({ phoneNumberId: "unknown", fromPhone: "+549111", messageText: "Hola" });

    expect(clientRepository.findByPhone).not.toHaveBeenCalled();
    expect(sendMessageUseCase.execute).not.toHaveBeenCalled();
    expect(whatsAppClient.sendTextMessage).not.toHaveBeenCalled();
  });

  it("auto-creates a client and starts a new conversation on the first message", async () => {
    const { business, businessRepository, clientRepository, conversationRepository, sendMessageUseCase, whatsAppClient } =
      mocks();

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      noopLogger,
    );

    await useCase.execute({
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

  it("reuses the existing client and conversation on subsequent messages", async () => {
    const { business, businessRepository, clientRepository, conversationRepository, sendMessageUseCase, whatsAppClient } =
      mocks();
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
      noopLogger,
    );

    await useCase.execute({
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
    const { businessRepository, clientRepository, conversationRepository, sendMessageUseCase, whatsAppClient } =
      mocks();
    sendMessageUseCase.execute = vi
      .fn()
      .mockResolvedValue(Result.fail(new Error("boom") as never));

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      noopLogger,
    );

    await useCase.execute({ phoneNumberId: "pn-1", fromPhone: "+5491100000000", messageText: "Hola" });

    expect(whatsAppClient.sendTextMessage).not.toHaveBeenCalled();
  });

  it("does not throw when sending the WhatsApp reply fails", async () => {
    const { businessRepository, clientRepository, conversationRepository, sendMessageUseCase, whatsAppClient } =
      mocks();
    whatsAppClient.sendTextMessage = vi.fn().mockRejectedValue(new Error("network down"));

    const useCase = new ReceiveWhatsAppMessageUseCase(
      businessRepository,
      clientRepository,
      conversationRepository,
      sendMessageUseCase,
      whatsAppClient,
      noopLogger,
    );

    await expect(
      useCase.execute({ phoneNumberId: "pn-1", fromPhone: "+5491100000000", messageText: "Hola" }),
    ).resolves.toBeUndefined();
  });
});
