import type { Request, Response } from "express";
import type { ILogger } from "../../../shared/logger/Logger.js";
import type { ReceiveWhatsAppMessageUseCase } from "../application/use-cases/ReceiveWhatsAppMessageUseCase.js";
import type { WhatsAppWebhookPayload } from "../application/dtos/WhatsAppWebhookPayload.js";

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
            if (message.type !== "text" || !message.text) continue;

            const contactName = value.contacts?.find((c) => c.wa_id === message.from)?.profile
              .name;

            await this.receiveUseCase.execute({
              phoneNumberId,
              fromPhone: message.from,
              messageText: message.text.body,
              contactName,
            });
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
