import { Result } from "../../../../shared/result/Result.js";
import { AppError, InfrastructureError, NotFoundError } from "../../../../shared/errors/AppError.js";
import { Message } from "../../domain/Message.js";
import type { IConversationRepository } from "../repositories/IConversationRepository.js";
import type { IMessageRepository } from "../repositories/IMessageRepository.js";
import type { ConversationChannelSender } from "../providers/ConversationChannelSender.js";
import type { ProductTracker } from "../../../../shared/telemetry/ProductTracker.js";
import { NoopProductTracker } from "../../../../shared/telemetry/NoopProductTracker.js";

export interface SendManualReplyInputDTO {
  message: string;
}

export interface SendManualReplyOutputDTO {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  botPaused: boolean;
}

/**
 * Una persona del negocio responde desde el panel y el mensaje sale por el
 * canal del cliente (hoy, WhatsApp).
 */
export class SendManualReplyUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
    private readonly messageRepository: IMessageRepository,
    private readonly channelSender: ConversationChannelSender,
    private readonly tracker: ProductTracker = new NoopProductTracker(),
  ) {}

  async execute(
    businessId: string,
    conversationId: string,
    input: SendManualReplyInputDTO,
  ): Promise<Result<SendManualReplyOutputDTO, AppError>> {
    const conversation = await this.conversationRepository.findById(businessId, conversationId);
    if (!conversation) {
      return Result.fail(new NotFoundError("Conversation not found"));
    }

    // Se entrega primero y se persiste después: al revés, un fallo de entrega
    // dejaría en el panel un mensaje que el cliente nunca recibió, que es peor
    // que no tener registro — el negocio creería que ya contestó.
    try {
      await this.channelSender.send({
        businessId,
        clientId: conversation.clientId,
        channel: conversation.channel,
        text: input.message,
      });
    } catch (err) {
      // Un 4xx del canal es algo que quien atiende puede arreglar —falta
      // vincular el número de WhatsApp, el cliente no tiene teléfono— así que
      // el motivo se propaga tal cual en vez de esconderse detrás de un
      // "no se pudo entregar" genérico. Los 5xx sí se envuelven: el detalle
      // interno viaja en `cause`, para los logs, no para la respuesta HTTP.
      if (err instanceof AppError && err.statusCode < 500) {
        return Result.fail(err);
      }
      return Result.fail(
        new InfrastructureError("Could not deliver the reply to the customer", undefined, {
          cause: err,
        }),
      );
    }

    const message = Message.create({
      conversationId: conversation.id,
      businessId,
      role: "agent",
      content: input.message,
    });
    await this.messageRepository.save(message);

    // Intervenir implica tomar la conversación: a partir de acá contesta la
    // persona, no la IA, hasta que la devuelvan explícitamente.
    conversation.pauseBot();
    await this.conversationRepository.save(conversation);

    this.tracker.track(businessId, "manual_reply_sent", { channel: conversation.channel });

    return Result.ok({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      botPaused: conversation.isBotPaused,
    });
  }
}
