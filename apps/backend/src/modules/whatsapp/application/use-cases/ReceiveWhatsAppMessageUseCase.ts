import type { ILogger } from "../../../../shared/logger/Logger.js";
import type { IBusinessRepository } from "../../../businesses/application/repositories/IBusinessRepository.js";
import type { IClientRepository } from "../../../clients/application/repositories/IClientRepository.js";
import { Client } from "../../../clients/domain/Client.js";
import type { IConversationRepository } from "../../../conversations/application/repositories/IConversationRepository.js";
import type { SendMessageUseCase } from "../../../conversations/application/use-cases/SendMessageUseCase.js";
import type { WhatsAppClient } from "../providers/WhatsAppClient.js";

const WHATSAPP_CHANNEL = "whatsapp";

export interface ReceiveWhatsAppMessageInput {
  phoneNumberId: string;
  fromPhone: string;
  messageText: string;
  contactName?: string | undefined;
}

/**
 * Never throws — the webhook controller must always ack Meta with 200
 * regardless of what happens here. Every failure path is logged, not raised.
 */
export class ReceiveWhatsAppMessageUseCase {
  constructor(
    private readonly businessRepository: IBusinessRepository,
    private readonly clientRepository: IClientRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly whatsAppClient: WhatsAppClient,
    private readonly logger: ILogger,
  ) {}

  async execute(input: ReceiveWhatsAppMessageInput): Promise<void> {
    const business = await this.businessRepository.findByWhatsAppPhoneNumberId(
      input.phoneNumberId,
    );
    if (!business) {
      this.logger.warn("Received WhatsApp message for an unknown phone_number_id", {
        phoneNumberId: input.phoneNumberId,
      });
      return;
    }

    let client = await this.clientRepository.findByPhone(business.id, input.fromPhone);
    if (!client) {
      const clientResult = Client.create({
        businessId: business.id,
        name: input.contactName ?? input.fromPhone,
        phone: input.fromPhone,
      });
      if (clientResult.isFailure) {
        this.logger.error("Failed to auto-create WhatsApp client", {
          businessId: business.id,
          reason: clientResult.error.message,
        });
        return;
      }
      client = clientResult.value;
      await this.clientRepository.save(client);
    }

    const conversation = await this.conversationRepository.findLatestByClientAndChannel(
      business.id,
      client.id,
      WHATSAPP_CHANNEL,
    );

    const result = await this.sendMessageUseCase.execute(business.id, {
      message: input.messageText,
      conversationId: conversation?.id,
      clientId: conversation ? undefined : client.id,
      channel: WHATSAPP_CHANNEL,
    });

    if (result.isFailure) {
      this.logger.error("Failed to generate a reply for an incoming WhatsApp message", {
        businessId: business.id,
        reason: result.error.message,
      });
      return;
    }

    try {
      await this.whatsAppClient.sendTextMessage(
        input.phoneNumberId,
        input.fromPhone,
        result.value.reply,
      );
    } catch (err) {
      this.logger.error("Failed to send the WhatsApp reply", {
        businessId: business.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
