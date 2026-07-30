import express, { type Express } from "express";
import cors from "cors";
import type { IDbClient } from "./shared/database/DbClient.js";
import type { ILogger } from "./shared/logger/Logger.js";
import { createRequestLogger } from "./presentation/middlewares/requestLogger.js";
import { createErrorHandler } from "./presentation/middlewares/errorHandler.js";
import { buildRootRouter } from "./presentation/router.js";
import { createBusinessesModule } from "./modules/businesses/businesses.module.js";
import { createAuthModule, type AuthModuleConfig } from "./modules/auth/auth.module.js";
import { createAIProvider, type AIModuleConfig } from "./modules/ai/ai.module.js";
import type { AIProvider } from "./modules/ai/application/providers/AIProvider.js";
import { createClientsModule } from "./modules/clients/clients.module.js";
import { createProductsModule } from "./modules/products/products.module.js";
import { createSearchProductsTool } from "./modules/products/application/tools/SearchProductsTool.js";
import { createServicesModule } from "./modules/services/services.module.js";
import { createSearchServicesTool } from "./modules/services/application/tools/SearchServicesTool.js";
import { createKnowledgeModule } from "./modules/knowledge/knowledge.module.js";
import { createSearchFaqsTool } from "./modules/knowledge/application/tools/SearchFaqsTool.js";
import { createConversationsModule } from "./modules/conversations/conversations.module.js";
import { createWhatsAppModule, type WhatsAppModuleConfig } from "./modules/whatsapp/whatsapp.module.js";
import type { WhatsAppClient } from "./modules/whatsapp/application/providers/WhatsAppClient.js";
import { createSubscriptionsModule } from "./modules/subscriptions/subscriptions.module.js";
import type { PaymentProvider } from "./modules/subscriptions/application/providers/PaymentProvider.js";
import { createMemoryModule } from "./modules/memory/memory.module.js";
import { createGuardarMemoriaTool } from "./modules/memory/application/tools/GuardarMemoriaTool.js";
import { createBuscarMemoriaTool } from "./modules/memory/application/tools/BuscarMemoriaTool.js";

export function createApp(
  db: IDbClient,
  logger: ILogger,
  authConfig: AuthModuleConfig,
  aiConfig: AIModuleConfig = { openaiApiKey: undefined, openaiModel: "gpt-4o-mini" },
  aiProviderOverride?: AIProvider,
  whatsappConfig: WhatsAppModuleConfig = {
    verifyToken: undefined,
    accessToken: undefined,
    appSecret: undefined,
    apiVersion: "v21.0",
  },
  whatsAppClientOverride?: WhatsAppClient,
  corsOrigin: string = "http://localhost:3001",
  paymentProviderOverride?: PaymentProvider,
): Express {
  const app = express();

  app.use(cors({ origin: corsOrigin }));
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(createRequestLogger(logger));

  const auth = createAuthModule(db, logger, authConfig);
  const businesses = createBusinessesModule(db, auth.authenticate);
  const clients = createClientsModule(db, auth.authenticate);
  const subscriptions = createSubscriptionsModule(db, auth.authenticate, paymentProviderOverride);
  const products = createProductsModule(db, auth.authenticate, subscriptions.planLimitReader);
  const services = createServicesModule(db, auth.authenticate, subscriptions.planLimitReader);
  const knowledge = createKnowledgeModule(db, auth.authenticate);
  const memory = createMemoryModule(db, auth.authenticate);
  const aiProvider = createAIProvider(aiConfig, aiProviderOverride);
  const conversations = createConversationsModule(
    db,
    auth.authenticate,
    aiProvider,
    subscriptions.planLimitReader,
    (businessId, clientId) => [
      createSearchProductsTool(products.repository, businessId),
      createSearchServicesTool(services.repository, businessId),
      createSearchFaqsTool(knowledge.repository, businessId),
      createBuscarMemoriaTool(memory.repository, businessId, clientId),
      createGuardarMemoriaTool(memory.repository, businessId, clientId),
    ],
  );
  const whatsapp = createWhatsAppModule(
    db,
    logger,
    whatsappConfig,
    conversations.sendMessageUseCase,
    aiProvider,
    whatsAppClientOverride,
  );

  app.use(
    buildRootRouter([
      { path: "/businesses", router: businesses.router },
      { path: "/auth", router: auth.router },
      { path: "/clients", router: clients.router },
      { path: "/products", router: products.router },
      { path: "/services", router: services.router },
      { path: "/faqs", router: knowledge.router },
      { path: "/conversations", router: conversations.router },
      { path: "/webhooks/whatsapp", router: whatsapp.router },
      { path: "/plans", router: subscriptions.planRouter },
      { path: "/subscriptions", router: subscriptions.subscriptionRouter },
      { path: "/", router: memory.router },
    ]),
  );

  app.use(createErrorHandler(logger));

  return app;
}
