import { Router, type RequestHandler } from "express";
import type { FaqController } from "./FaqController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import {
  createFaqSchema,
  deleteFaqSchema,
  getFaqByIdSchema,
  listFaqsSchema,
  updateFaqSchema,
} from "./validation/faqSchemas.js";

export function buildFaqRouter(controller: FaqController, authenticate: RequestHandler): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/", validate(createFaqSchema), controller.create);
  router.get("/:id", validate(getFaqByIdSchema), controller.getById);
  router.get("/", validate(listFaqsSchema), controller.list);
  router.patch("/:id", validate(updateFaqSchema), controller.update);
  router.delete("/:id", validate(deleteFaqSchema), controller.delete);

  return router;
}
