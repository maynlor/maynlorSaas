import { Router, type RequestHandler } from "express";
import type { BusinessController } from "./BusinessController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import { linkWhatsAppSchema } from "./validation/businessSchemas.js";

export function buildBusinessRouter(
  controller: BusinessController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.get("/me", controller.me);
  router.patch("/me", validate(linkWhatsAppSchema), controller.linkWhatsApp);

  return router;
}
