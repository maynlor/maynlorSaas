import { Router, type RequestHandler } from "express";
import type { AnalyticsController } from "./AnalyticsController.js";

export function buildAnalyticsRouter(controller: AnalyticsController, authenticate: RequestHandler): Router {
  const router = Router();

  router.use(authenticate);
  router.get("/summary", controller.getSummary);

  return router;
}
