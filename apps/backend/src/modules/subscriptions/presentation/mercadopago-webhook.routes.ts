import { Router } from "express";
import type { MercadoPagoWebhookController } from "./MercadoPagoWebhookController.js";

export function buildMercadoPagoWebhookRouter(controller: MercadoPagoWebhookController): Router {
  const router = Router();

  router.post("/", (req, res, next) => {
    controller.receive(req, res).catch(next);
  });

  return router;
}
