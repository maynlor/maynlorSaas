import { describe, it, expect, vi } from "vitest";
import { SendManualReplyUseCase } from "@modules/conversations/application/use-cases/SendManualReplyUseCase.js";
import { Conversation } from "@modules/conversations/domain/Conversation.js";
import type { IConversationRepository } from "@modules/conversations/application/repositories/IConversationRepository.js";
import type { IMessageRepository } from "@modules/conversations/application/repositories/IMessageRepository.js";
import type { ConversationChannelSender } from "@modules/conversations/application/providers/ConversationChannelSender.js";

const businessId = "11111111-1111-1111-1111-111111111111";

function mocks() {
  const conversation = Conversation.create({
    businessId,
    clientId: "22222222-2222-2222-2222-222222222222",
    channel: "whatsapp",
  });
  const conversationRepository: IConversationRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(conversation),
    findAll: vi.fn(),
    findLatestByClientAndChannel: vi.fn(),
    countCreatedSince: vi.fn(),
  };
  const messageRepository: IMessageRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findByConversationId: vi.fn(),
    findRecentByConversationId: vi.fn(),
  };
  const channelSender: ConversationChannelSender = {
    send: vi.fn().mockResolvedValue(undefined),
  };
  return { conversation, conversationRepository, messageRepository, channelSender };
}

describe("SendManualReplyUseCase", () => {
  it("delivers the reply to the customer and records it as written by a person", async () => {
    const { conversation, conversationRepository, messageRepository, channelSender } = mocks();
    const useCase = new SendManualReplyUseCase(
      conversationRepository,
      messageRepository,
      channelSender,
    );

    const result = await useCase.execute(businessId, conversation.id, { message: "Ya te lo envío" });

    expect(result.isSuccess).toBe(true);
    expect(channelSender.send).toHaveBeenCalledWith({
      businessId,
      clientId: conversation.clientId,
      channel: "whatsapp",
      text: "Ya te lo envío",
    });
    // El rol distingue lo que escribió una persona de lo que generó la IA.
    expect(result.value.role).toBe("agent");
  });

  it("takes the conversation away from the bot", async () => {
    const { conversation, conversationRepository, messageRepository, channelSender } = mocks();
    const useCase = new SendManualReplyUseCase(
      conversationRepository,
      messageRepository,
      channelSender,
    );

    expect(conversation.isBotPaused).toBe(false);
    const result = await useCase.execute(businessId, conversation.id, { message: "Yo sigo" });

    expect(conversation.isBotPaused).toBe(true);
    expect(result.value.botPaused).toBe(true);
    expect(conversationRepository.save).toHaveBeenCalledWith(conversation);
  });

  it("does not record a message the customer never received", async () => {
    // Al revés, el panel mostraría una respuesta enviada que nunca salió y el
    // negocio creería que ya contestó.
    const { conversation, conversationRepository, messageRepository, channelSender } = mocks();
    channelSender.send = vi.fn().mockRejectedValue(new Error("Meta rejected the recipient"));
    const useCase = new SendManualReplyUseCase(
      conversationRepository,
      messageRepository,
      channelSender,
    );

    const result = await useCase.execute(businessId, conversation.id, { message: "Hola" });

    expect(result.isFailure).toBe(true);
    expect(messageRepository.save).not.toHaveBeenCalled();
    expect(conversation.isBotPaused).toBe(false);
  });

  it("keeps the provider's reason for the delivery failure", async () => {
    const { conversation, conversationRepository, messageRepository, channelSender } = mocks();
    channelSender.send = vi
      .fn()
      .mockRejectedValue(new Error("(#131030) Recipient phone number not in allowed list"));
    const useCase = new SendManualReplyUseCase(
      conversationRepository,
      messageRepository,
      channelSender,
    );

    const result = await useCase.execute(businessId, conversation.id, { message: "Hola" });

    expect((result.error.cause as Error).message).toContain("131030");
  });

  it("fails when the conversation belongs to another business", async () => {
    const { conversationRepository, messageRepository, channelSender } = mocks();
    conversationRepository.findById = vi.fn().mockResolvedValue(null);
    const useCase = new SendManualReplyUseCase(
      conversationRepository,
      messageRepository,
      channelSender,
    );

    const result = await useCase.execute(businessId, "33333333-3333-3333-3333-333333333333", {
      message: "Hola",
    });

    expect(result.isFailure).toBe(true);
    expect(channelSender.send).not.toHaveBeenCalled();
  });
});
