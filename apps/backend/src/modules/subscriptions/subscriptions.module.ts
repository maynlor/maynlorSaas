import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import { PostgresPlanRepository } from "./infrastructure/persistence/PostgresPlanRepository.js";
import { PostgresSubscriptionRepository } from "./infrastructure/persistence/PostgresSubscriptionRepository.js";
import { ManualPaymentProvider } from "./infrastructure/providers/ManualPaymentProvider.js";
import type { PaymentProvider } from "./application/providers/PaymentProvider.js";
import { ListPlansUseCase } from "./application/use-cases/ListPlansUseCase.js";
import { GetCurrentSubscriptionUseCase } from "./application/use-cases/GetCurrentSubscriptionUseCase.js";
import { SubscribeToPlanUseCase } from "./application/use-cases/SubscribeToPlanUseCase.js";
import { CancelSubscriptionUseCase } from "./application/use-cases/CancelSubscriptionUseCase.js";
import { PlanController } from "./presentation/PlanController.js";
import { buildPlanRouter } from "./presentation/plan.routes.js";
import { SubscriptionController } from "./presentation/SubscriptionController.js";
import { buildSubscriptionRouter } from "./presentation/subscription.routes.js";

export function createSubscriptionsModule(
  db: IDbClient,
  authenticate: RequestHandler,
  paymentProviderOverride?: PaymentProvider,
): { planRouter: Router; subscriptionRouter: Router } {
  const planRepository = new PostgresPlanRepository(db);
  const subscriptionRepository = new PostgresSubscriptionRepository(db);
  const paymentProvider = paymentProviderOverride ?? new ManualPaymentProvider();

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
  };
}
