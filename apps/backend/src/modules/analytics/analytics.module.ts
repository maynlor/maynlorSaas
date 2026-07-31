import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { PlanLimitReader } from "../subscriptions/application/services/PlanLimitReader.js";
import { PostgresConversationRepository } from "../conversations/infrastructure/persistence/PostgresConversationRepository.js";
import { PostgresAnalyticsRepository } from "./infrastructure/persistence/PostgresAnalyticsRepository.js";
import { GetAnalyticsSummaryUseCase } from "./application/use-cases/GetAnalyticsSummaryUseCase.js";
import { AnalyticsController } from "./presentation/AnalyticsController.js";
import { buildAnalyticsRouter } from "./presentation/analytics.routes.js";

export function createAnalyticsModule(
  db: IDbClient,
  authenticate: RequestHandler,
  planLimitReader: PlanLimitReader,
): { router: Router } {
  const analyticsRepository = new PostgresAnalyticsRepository(db);
  const conversationRepository = new PostgresConversationRepository(db);

  const getSummaryUseCase = new GetAnalyticsSummaryUseCase(analyticsRepository, conversationRepository, planLimitReader);
  const controller = new AnalyticsController(getSummaryUseCase);

  return { router: buildAnalyticsRouter(controller, authenticate) };
}
