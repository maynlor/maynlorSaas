import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import { PostgresPlanRepository } from "./infrastructure/persistence/PostgresPlanRepository.js";
import { PostgresSubscriptionRepository } from "./infrastructure/persistence/PostgresSubscriptionRepository.js";
import type { PaymentProvider } from "./application/providers/PaymentProvider.js";
import { ListPlansUseCase } from "./application/use-cases/ListPlansUseCase.js";
import { GetCurrentSubscriptionUseCase } from "./application/use-cases/GetCurrentSubscriptionUseCase.js";
import { SubscribeToPlanUseCase } from "./application/use-cases/SubscribeToPlanUseCase.js";
import { CancelSubscriptionUseCase } from "./application/use-cases/CancelSubscriptionUseCase.js";
import { PlanController } from "./presentation/PlanController.js";
import { buildPlanRouter } from "./presentation/plan.routes.js";
import { SubscriptionController } from "./presentation/SubscriptionController.js";
import { buildSubscriptionRouter } from "./presentation/subscription.routes.js";
import { PlanLimitReader } from "./application/services/PlanLimitReader.js";

export function createSubscriptionsModule(
  db: IDbClient,
  authenticate: RequestHandler,
  paymentProvider: PaymentProvider,
): { planRouter: Router; subscriptionRouter: Router; planLimitReader: PlanLimitReader } {
  const planRepository = new PostgresPlanRepository(db);
  const subscriptionRepository = new PostgresSubscriptionRepository(db);
  const planLimitReader = new PlanLimitReader(subscriptionRepository, planRepository);

  const listPlansUseCase = new ListPlansUseCase(planRepository);
  const getCurrentUseCase = new GetCurrentSubscriptionUseCase(subscriptionRepository, planRepository);
  const subscribeUseCase = new SubscribeToPlanUseCase(
    planRepository,
    subscriptionRepository,
    paymentProvider,
  );
  const cancelUseCase = new CancelSubscriptionUseCase(subscriptionRepository, planRepository);

  const planController = new PlanController(listPlansUseCase);
  const subscriptionController = new SubscriptionController(
    getCurrentUseCase,
    subscribeUseCase,
    cancelUseCase,
  );

  return {
    planRouter: buildPlanRouter(planController),
    subscriptionRouter: buildSubscriptionRouter(subscriptionController, authenticate),
    planLimitReader,
  };
}
