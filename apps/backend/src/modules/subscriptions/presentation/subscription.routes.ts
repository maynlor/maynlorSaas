import { Router, type RequestHandler } from "express";
import type { SubscriptionController } from "./SubscriptionController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import { createSubscriptionSchema } from "./validation/subscriptionSchemas.js";

export function buildSubscriptionRouter(
  controller: SubscriptionController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.get("/me", controller.getCurrent);
  router.get("/me/payments", controller.listPayments);
  router.post("/", validate(createSubscriptionSchema), controller.subscribe);
  router.delete("/me", controller.cancel);

  return router;
}
