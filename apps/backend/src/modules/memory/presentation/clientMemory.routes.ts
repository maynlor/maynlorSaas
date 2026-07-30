import { Router, type RequestHandler } from "express";
import type { ClientMemoryController } from "./ClientMemoryController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import {
  createClientMemorySchema,
  deleteClientMemorySchema,
  listClientMemoriesSchema,
} from "./validation/clientMemorySchemas.js";

export function buildClientMemoryRouter(
  controller: ClientMemoryController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/clients/:clientId/memories", validate(createClientMemorySchema), controller.add);
  router.get("/clients/:clientId/memories", validate(listClientMemoriesSchema), controller.list);
  router.delete(
    "/clients/:clientId/memories/:id",
    validate(deleteClientMemorySchema),
    controller.delete,
  );

  return router;
}
