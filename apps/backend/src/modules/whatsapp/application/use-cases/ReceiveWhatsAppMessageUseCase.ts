import type { ILogger } from "../../../../shared/logger/Logger.js";
import { PlanLimitExceededError } from "../../../../shared/errors/AppError.js";
import type { IInboundMessageRepository } from "../repositories/IInboundMessageRepository.js";
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
  /** El `wamid` de Meta: identifica el mensaje para no procesarlo dos veces. */
  externalId: string;
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
    case "image": {
      try {
        const file = await whatsAppClient.downloadMedia(media.mediaId);
        const description = await aiProvider.describeImage(file.buffer, file.mimeType);
        return media.caption
          ? `[El cliente envió una imagen con el comentario "${media.caption}". Descripción de la imagen]: ${description}`
          : `[El cliente envió una imagen. Descripción de la imagen]: ${description}`;
      } catch (err) {
        logger.error("Failed to describe an incoming WhatsApp image", {
          reason: err instanceof Error ? err.message : String(err),
        });
        return media.caption
          ? `[El cliente envió una imagen con el comentario]: ${media.caption}`
          : "[El cliente envió una imagen sin comentario]";
      }
    }
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
 * Distingue un final definitivo de uno reintentable. Un fallo transitorio (la
 * IA caída, la red) tiene que poder reprocesarse cuando Meta reintente; una
 * condición permanente (un `phone_number_id` desconocido) no, o se repetiría
 * en cada reintento sin cambiar nada.
 */
type ProcessingOutcome = "done" | "retryable";

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
    private readonly inboundMessageRepository: IInboundMessageRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(input: ReceiveWhatsAppMessageInput): Promise<void> {
    const claimed = await this.inboundMessageRepository.claim(
      input.externalId,
      input.phoneNumberId,
    );
    if (!claimed) {
      this.logger.info("Ignoring an already-seen WhatsApp message", {
        externalId: input.externalId,
      });
      return;
    }

    let outcome: ProcessingOutcome;
    try {
      outcome = await this.process(input);
    } catch (err) {
      // El caso de uso no debe tirar, pero si algo inesperado escapa, el
      // mensaje tiene que quedar reintentable en vez de morir como "en proceso".
      this.logger.error("Unexpected failure processing a WhatsApp message", {
        externalId: input.externalId,
        reason: err instanceof Error ? err.message : String(err),
      });
      outcome = "retryable";
    }

    if (outcome === "done") {
      await this.inboundMessageRepository.markCompleted(input.externalId);
    } else {
      await this.inboundMessageRepository.markFailed(input.externalId);
    }
  }

  private async process(input: ReceiveWhatsAppMessageInput): Promise<ProcessingOutcome> {
    const business = await this.businessRepository.findByWhatsAppPhoneNumberId(
      input.phoneNumberId,
    );
    if (!business) {
      this.logger.warn("Received WhatsApp message for an unknown phone_number_id", {
        phoneNumberId: input.phoneNumberId,
      });
      return "done";
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
      return "done";
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
        // Los datos del contacto no van a cambiar entre reintentos.
        return "done";
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
      // Quedarse sin cupo de plan no se arregla reintentando: el límite sigue
      // agotado. Cualquier otro fallo (IA caída, red) sí puede ser pasajero.
      return result.error instanceof PlanLimitExceededError ? "done" : "retryable";
    }

    try {
      if (result.value.quickReplies && result.value.quickReplies.length > 0) {
        await this.whatsAppClient.sendButtonsMessage(
          input.phoneNumberId,
          input.fromPhone,
          result.value.reply,
          result.value.quickReplies.map((title, index) => ({ id: `opcion_${index + 1}`, title })),
        );
      } else {
        await this.whatsAppClient.sendTextMessage(
          input.phoneNumberId,
          input.fromPhone,
          result.value.reply,
        );
      }
    } catch (err) {
      this.logger.error("Failed to send the WhatsApp reply", {
        businessId: business.id,
        // Sin el destinatario, un rechazo de Meta por "número no permitido" no
        // se puede contrastar contra su lista de autorizados: el formato del
        // número (el 9 de los móviles argentinos, por ejemplo) es justamente lo
        // que suele no coincidir.
        to: input.fromPhone,
        reason: err instanceof Error ? err.message : String(err),
      });
      // La respuesta se generó pero el cliente no la recibió. Se deja
      // reintentable: que quede sin respuesta es peor que regenerarla.
      return "retryable";
    }

    return "done";
  }
}
