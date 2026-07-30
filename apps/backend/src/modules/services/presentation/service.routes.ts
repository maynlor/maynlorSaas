import { Router, type RequestHandler } from "express";
import type { ServiceController } from "./ServiceController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import {
  createServiceSchema,
  deleteServiceSchema,
  getServiceByIdSchema,
  listServicesSchema,
  updateServiceSchema,
} from "./validation/serviceSchemas.js";

export function buildServiceRouter(
  controller: ServiceController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/", validate(createServiceSchema), controller.create);
  router.get("/:id", validate(getServiceByIdSchema), controller.getById);
  router.get("/", validate(listServicesSchema), controller.list);
  router.patch("/:id", validate(updateServiceSchema), controller.update);
  router.delete("/:id", validate(deleteServiceSchema), controller.delete);

  return router;
}
