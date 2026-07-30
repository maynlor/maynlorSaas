import type { Request, Response } from "express";
import type { ILogger } from "../../../shared/logger/Logger.js";
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
): Omit<ReceiveWhatsAppMessageInput, "phoneNumberId"> | null {
  if (message.type === "text" && message.text) {
    return { fromPhone: message.from, contactName, messageText: message.text.body };
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

  receive = async (req: Request, res: Response): Promise<void> => {
    const payload = req.body as WhatsAppWebhookPayload;

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

            await this.receiveUseCase.execute({ phoneNumberId, ...partialInput });
          }
        }
      }
    } catch (err) {
      this.logger.error("Unexpected error processing WhatsApp webhook", {
        reason: err instanceof Error ? err.message : String(err),
      });
    }

    res.sendStatus(200);
  };
}
