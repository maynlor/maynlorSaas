import { Router, type RequestHandler } from "express";
import type { WhatsAppWebhookController } from "./WhatsAppWebhookController.js";

export function buildWhatsAppRouter(
  controller: WhatsAppWebhookController,
  verifySignature: RequestHandler,
): Router {
  const router = Router();

  router.get("/", controller.verify);
  router.post("/", verifySignature, controller.receive);

  return router;
}
