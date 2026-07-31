import type { Request, Response } from "express";
import type { ILogger } from "../../../shared/logger/Logger.js";
import type { IBackgroundRunner } from "../../../shared/background/BackgroundRunner.js";
import type {
  ReceiveWhatsAppMessageUseCase,
  ReceiveWhatsAppMessageInput,
  WhatsAppMediaType,
} from "../application/use-cases/ReceiveWhatsAppMessageUseCase.js";
import type {
  WhatsAppIncomingMessage,
  WhatsAppWebhookPayload,
} from "../application/dtos/WhatsAppWebhookPayload.js";

const SUPPORTED_MEDIA_TYPES: WhatsAppMediaType[] = ["image", "audio", "video", "document"];

function toReceiveInput(
  message: WhatsAppIncomingMessage,
  contactName: string | undefined,
): Omit<ReceiveWhatsAppMessageInput, "phoneNumberId" | "externalId"> | null {
  if (message.type === "text" && message.text) {
    return { fromPhone: message.from, contactName, messageText: message.text.body };
  }

  if (message.type === "interactive" && message.interactive?.button_reply) {
    return {
      fromPhone: message.from,
      contactName,
      messageText: message.interactive.button_reply.title,
    };
  }

  if (SUPPORTED_MEDIA_TYPES.includes(message.type as WhatsAppMediaType)) {
    const mediaType = message.type as WhatsAppMediaType;
    const mediaObject = message[mediaType];
    if (!mediaObject) return null;

    return {
      fromPhone: message.from,
      contactName,
      media: {
        type: mediaType,
        mediaId: mediaObject.id,
        caption: mediaObject.caption,
        filename: "filename" in mediaObject ? mediaObject.filename : undefined,
      },
    };
  }

  return null;
}

export class WhatsAppWebhookController {
  constructor(
    private readonly verifyToken: string | undefined,
    private readonly receiveUseCase: ReceiveWhatsAppMessageUseCase,
    private readonly backgroundRunner: IBackgroundRunner,
    private readonly logger: ILogger,
  ) {}

  verify = (req: Request, res: Response): void => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && this.verifyToken && token === this.verifyToken) {
      res.status(200).send(String(challenge ?? ""));
      return;
    }

    res.sendStatus(403);
  };

  /**
   * Le contesta 200 a Meta antes de procesar. Procesar un mensaje implica
   * descargar media, transcribir o describir, y consultar al LLM con
   * herramientas: decenas de segundos. Meta no espera tanto — daría la entrega
   * por fallida y reintentaría, duplicando la respuesta al cliente.
   *
   * La deduplicación por `wamid` vive en el caso de uso, así que un reintento
   * que llegue igual (por lentitud de red, por ejemplo) se descarta ahí.
   */
  receive = (req: Request, res: Response): void => {
    const payload = req.body as WhatsAppWebhookPayload;
    const inputs: ReceiveWhatsAppMessageInput[] = [];

    try {
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          const phoneNumberId = value?.metadata?.phone_number_id;
          const messages = value?.messages ?? [];

          for (const message of messages) {
            const contactName = value.contacts?.find((c) => c.wa_id === message.from)?.profile
              .name;

            const partialInput = toReceiveInput(message, contactName);
            if (!partialInput) continue;

            inputs.push({ externalId: message.id, phoneNumberId, ...partialInput });
          }
        }
      }
    } catch (err) {
      this.logger.error("Unexpected error parsing WhatsApp webhook", {
        reason: err instanceof Error ? err.message : String(err),
      });
    }

    res.sendStatus(200);

    for (const input of inputs) {
      this.backgroundRunner.run(() => this.receiveUseCase.execute(input));
    }
  };
}
