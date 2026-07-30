import { Router } from "express";
import type { PlanController } from "./PlanController.js";

export function buildPlanRouter(controller: PlanController): Router {
  const router = Router();

  router.get("/", controller.list);

  return router;
}
