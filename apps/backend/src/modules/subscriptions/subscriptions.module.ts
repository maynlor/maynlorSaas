import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { ILogger } from "../../shared/logger/Logger.js";
import { PostgresBusinessRepository } from "../businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresPlanRepository } from "./infrastructure/persistence/PostgresPlanRepository.js";
import { PostgresSubscriptionRepository } from "./infrastructure/persistence/PostgresSubscriptionRepository.js";
import { PostgresSubscriptionPaymentRepository } from "./infrastructure/persistence/PostgresSubscriptionPaymentRepository.js";
import { ListSubscriptionPaymentsUseCase } from "./application/use-cases/ListSubscriptionPaymentsUseCase.js";
import type { PaymentProvider } from "./application/providers/PaymentProvider.js";
import { ListPlansUseCase } from "./application/use-cases/ListPlansUseCase.js";
import { GetCurrentSubscriptionUseCase } from "./application/use-cases/GetCurrentSubscriptionUseCase.js";
import { SubscribeToPlanUseCase } from "./application/use-cases/SubscribeToPlanUseCase.js";
import { CancelSubscriptionUseCase } from "./application/use-cases/CancelSubscriptionUseCase.js";
import { HandleMercadoPagoWebhookUseCase } from "./application/use-cases/HandleMercadoPagoWebhookUseCase.js";
import { PlanController } from "./presentation/PlanController.js";
import { buildPlanRouter } from "./presentation/plan.routes.js";
import { SubscriptionController } from "./presentation/SubscriptionController.js";
import { buildSubscriptionRouter } from "./presentation/subscription.routes.js";
import { MercadoPagoWebhookController } from "./presentation/MercadoPagoWebhookController.js";
import { buildMercadoPagoWebhookRouter } from "./presentation/mercadopago-webhook.routes.js";
import { PlanLimitReader } from "./application/services/PlanLimitReader.js";
import type { ProductTracker } from "../../shared/telemetry/ProductTracker.js";
import { NoopProductTracker } from "../../shared/telemetry/NoopProductTracker.js";

export function createSubscriptionsModule(
  db: IDbClient,
  logger: ILogger,
  authenticate: RequestHandler,
  paymentProvider: PaymentProvider,
  tracker: ProductTracker = new NoopProductTracker(),
): {
  planRouter: Router;
  subscriptionRouter: Router;
  mercadoPagoWebhookRouter: Router;
  planLimitReader: PlanLimitReader;
} {
  const businessRepository = new PostgresBusinessRepository(db);
  const planRepository = new PostgresPlanRepository(db);
  const subscriptionRepository = new PostgresSubscriptionRepository(db);
  const paymentRepository = new PostgresSubscriptionPaymentRepository(db);
  const planLimitReader = new PlanLimitReader(subscriptionRepository, planRepository, logger);

  const listPlansUseCase = new ListPlansUseCase(planRepository);
  const getCurrentUseCase = new GetCurrentSubscriptionUseCase(subscriptionRepository, planRepository);
  const subscribeUseCase = new SubscribeToPlanUseCase(
    planRepository,
    subscriptionRepository,
    businessRepository,
    paymentProvider,
    tracker,
  );
  const cancelUseCase = new CancelSubscriptionUseCase(subscriptionRepository, planRepository, paymentProvider);
  const listPaymentsUseCase = new ListSubscriptionPaymentsUseCase(paymentRepository);
  const handleWebhookUseCase = new HandleMercadoPagoWebhookUseCase(
    paymentProvider,
    subscriptionRepository,
    paymentRepository,
    logger,
  );

  const planController = new PlanController(listPlansUseCase);
  const subscriptionController = new SubscriptionController(
    getCurrentUseCase,
    subscribeUseCase,
    cancelUseCase,
    listPaymentsUseCase,
  );
  const webhookController = new MercadoPagoWebhookController(handleWebhookUseCase, logger);

  return {
    planRouter: buildPlanRouter(planController),
    subscriptionRouter: buildSubscriptionRouter(subscriptionController, authenticate),
    mercadoPagoWebhookRouter: buildMercadoPagoWebhookRouter(webhookController),
    planLimitReader,
  };
}
