import type { ILogger } from "../../../../shared/logger/Logger.js";
import type { IBusinessRepository } from "../../../businesses/application/repositories/IBusinessRepository.js";
import type { IClientRepository } from "../../../clients/application/repositories/IClientRepository.js";
import { Client } from "../../../clients/domain/Client.js";
import type { IConversationRepository } from "../../../conversations/application/repositories/IConversationRepository.js";
import type { SendMessageUseCase } from "../../../conversations/application/use-cases/SendMessageUseCase.js";
import type { AIProvider } from "../../../ai/application/providers/AIProvider.js";
import type { WhatsAppClient } from "../providers/WhatsAppClient.js";

const WHATSAPP_CHANNEL = "whatsapp";

export type WhatsAppMediaType = "image" | "audio" | "video" | "document";

export interface WhatsAppIncomingMedia {
  type: WhatsAppMediaType;
  mediaId: string;
  caption?: string | undefined;
  filename?: string | undefined;
}

export interface ReceiveWhatsAppMessageInput {
  phoneNumberId: string;
  fromPhone: string;
  contactName?: string | undefined;
  messageText?: string | undefined;
  media?: WhatsAppIncomingMedia | undefined;
}

async function resolveMessageText(
  input: ReceiveWhatsAppMessageInput,
  whatsAppClient: WhatsAppClient,
  aiProvider: AIProvider,
  logger: ILogger,
): Promise<string | null> {
  if (input.messageText) return input.messageText;
  if (!input.media) return null;

  const { media } = input;
  switch (media.type) {
    case "audio": {
      try {
        const file = await whatsAppClient.downloadMedia(media.mediaId);
        const transcript = await aiProvider.transcribeAudio(file.buffer, file.mimeType);
        return transcript.trim() || "[Nota de voz sin contenido reconocible]";
      } catch (err) {
        logger.error("Failed to transcribe an incoming WhatsApp audio message", {
          reason: err instanceof Error ? err.message : String(err),
        });
        return "[El cliente envió una nota de voz que no se pudo transcribir]";
      }
    }
    case "image":
      return media.caption
        ? `[El cliente envió una imagen con el comentario]: ${media.caption}`
        : "[El cliente envió una imagen sin comentario]";
    case "document":
      return `[El cliente envió un documento${media.filename ? `: ${media.filename}` : ""}]${
        media.caption ? ` con el comentario: ${media.caption}` : ""
      }`;
    case "video":
      return media.caption
        ? `[El cliente envió un video con el comentario]: ${media.caption}`
        : "[El cliente envió un video sin comentario]";
  }
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
    private readonly aiProvider: AIProvider,
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

    const messageText = await resolveMessageText(
      input,
      this.whatsAppClient,
      this.aiProvider,
      this.logger,
    );
    if (!messageText) {
      this.logger.warn("Received an unsupported WhatsApp message; ignoring", {
        businessId: business.id,
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
      message: messageText,
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
