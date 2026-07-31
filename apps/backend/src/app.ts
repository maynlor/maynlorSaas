import express, { type Express } from "express";
import cors from "cors";
import type { IDbClient } from "./shared/database/DbClient.js";
import type { ILogger } from "./shared/logger/Logger.js";
import { createRequestLogger } from "./presentation/middlewares/requestLogger.js";
import type { Redis } from "ioredis";
import {
  createApiRateLimiter,
  createAuthRateLimiter,
  createWebhookRateLimiter,
  createRateLimitStore,
  type RateLimitConfig,
} from "./presentation/middlewares/rateLimit.js";
import { createRedisClient } from "./shared/redis/createRedisClient.js";
import { createErrorHandler } from "./presentation/middlewares/errorHandler.js";
import { buildRootRouter } from "./presentation/router.js";
import { buildHealthRouter } from "./presentation/health.routes.js";
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
import { ManualPaymentProvider } from "./modules/subscriptions/infrastructure/providers/ManualPaymentProvider.js";
import { MercadoPagoPaymentProvider } from "./modules/subscriptions/infrastructure/providers/MercadoPagoPaymentProvider.js";
import { createMemoryModule } from "./modules/memory/memory.module.js";
import { createGuardarMemoriaTool } from "./modules/memory/application/tools/GuardarMemoriaTool.js";
import { createBuscarMemoriaTool } from "./modules/memory/application/tools/BuscarMemoriaTool.js";

export interface MercadoPagoModuleConfig {
  accessToken: string | undefined;
  webhookSecret: string | undefined;
  backUrl: string | undefined;
}

export interface RateLimitModuleConfig {
  api: RateLimitConfig;
  auth: RateLimitConfig;
  webhook: RateLimitConfig;
}

const MINUTE = 60_000;

export const DEFAULT_RATE_LIMITS: RateLimitModuleConfig = {
  api: { windowMs: MINUTE, max: 300 },
  // Mucho más bajo y por IP: encarece la fuerza bruta contra contraseñas.
  auth: { windowMs: 15 * MINUTE, max: 20 },
  webhook: { windowMs: MINUTE, max: 600 },
};

/**
 * Sin `webhookSecret` no hay forma de distinguir una notificación real de
 * Mercado Pago de una falsificada, y cualquiera podría activarse una
 * suscripción con un POST. Por eso se exige junto con el token en vez de
 * degradar silenciosamente a no verificar la firma.
 */
function createPaymentProvider(config: MercadoPagoModuleConfig, corsOrigin: string): PaymentProvider {
  if (!config.accessToken) {
    return new ManualPaymentProvider();
  }
  if (!config.webhookSecret) {
    throw new Error(
      "MERCADOPAGO_WEBHOOK_SECRET is required when MERCADOPAGO_ACCESS_TOKEN is set: " +
        "without it, Mercado Pago webhooks cannot be authenticated.",
    );
  }
  return new MercadoPagoPaymentProvider(config.accessToken, config.webhookSecret, config.backUrl ?? corsOrigin);
}

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
  mercadoPagoConfig: MercadoPagoModuleConfig = {
    accessToken: undefined,
    webhookSecret: undefined,
    backUrl: undefined,
  },
  rateLimitConfig: RateLimitModuleConfig = DEFAULT_RATE_LIMITS,
  redisClientOverride?: Redis,
  redisUrl?: string,
): Express {
  const app = express();

  // Necesario para que `req.ip` sea la IP real del cliente detrás del proxy de
  // Render/Railway; sin esto el rate limiting agruparía a todos bajo la IP del proxy.
  app.set("trust proxy", 1);

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(createRequestLogger(logger));

  const redisClient = redisClientOverride ?? createRedisClient(redisUrl, logger);
  app.use(createApiRateLimiter(rateLimitConfig.api, createRateLimitStore(redisClient, "api")));
  app.use("/auth", createAuthRateLimiter(rateLimitConfig.auth, createRateLimitStore(redisClient, "auth")));
  app.use("/webhooks", createWebhookRateLimiter(rateLimitConfig.webhook, createRateLimitStore(redisClient, "webhook")));

  const paymentProvider = paymentProviderOverride ?? createPaymentProvider(mercadoPagoConfig, corsOrigin);
  const auth = createAuthModule(db, logger, authConfig, paymentProvider);
  const businesses = createBusinessesModule(db, auth.authenticate);
  const clients = createClientsModule(db, auth.authenticate);
  const subscriptions = createSubscriptionsModule(db, logger, auth.authenticate, paymentProvider);
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
      { path: "/health", router: buildHealthRouter(db) },
      { path: "/plans", router: subscriptions.planRouter },
      { path: "/subscriptions", router: subscriptions.subscriptionRouter },
      { path: "/webhooks/mercadopago", router: subscriptions.mercadoPagoWebhookRouter },
      { path: "/", router: memory.router },
    ]),
  );

  app.use(createErrorHandler(logger));

  return app;
}
