import { Router, type RequestHandler } from "express";
import type { ClientController } from "./ClientController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import { createClientSchema, getClientByIdSchema, listClientsSchema } from "./validation/clientSchemas.js";

export function buildClientRouter(
  controller: ClientController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/", validate(createClientSchema), controller.create);
  router.get("/:id", validate(getClientByIdSchema), controller.getById);
  router.get("/", validate(listClientsSchema), controller.list);

  return router;
}
