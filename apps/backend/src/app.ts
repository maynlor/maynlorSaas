import express, { type Express } from "express";
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
import { createConversationsModule } from "./modules/conversations/conversations.module.js";
import { createWhatsAppModule, type WhatsAppModuleConfig } from "./modules/whatsapp/whatsapp.module.js";
import type { WhatsAppClient } from "./modules/whatsapp/application/providers/WhatsAppClient.js";

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
): Express {
  const app = express();

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
  const products = createProductsModule(db, auth.authenticate);
  const aiProvider = createAIProvider(aiConfig, aiProviderOverride);
  const conversations = createConversationsModule(db, auth.authenticate, aiProvider, (businessId) => [
    createSearchProductsTool(products.repository, businessId),
  ]);
  const whatsapp = createWhatsAppModule(
    db,
    logger,
    whatsappConfig,
    conversations.sendMessageUseCase,
    whatsAppClientOverride,
  );

  app.use(
    buildRootRouter([
      { path: "/businesses", router: businesses.router },
      { path: "/auth", router: auth.router },
      { path: "/clients", router: clients.router },
      { path: "/products", router: products.router },
      { path: "/conversations", router: conversations.router },
      { path: "/webhooks/whatsapp", router: whatsapp.router },
    ]),
  );

  app.use(createErrorHandler(logger));

  return app;
}
