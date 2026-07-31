import type { Router } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { ILogger } from "../../shared/logger/Logger.js";
import { PostgresBusinessRepository } from "../businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresClientRepository } from "../clients/infrastructure/persistence/PostgresClientRepository.js";
import { PostgresConversationRepository } from "../conversations/infrastructure/persistence/PostgresConversationRepository.js";
import type { SendMessageUseCase } from "../conversations/application/use-cases/SendMessageUseCase.js";
import type { AIProvider } from "../ai/application/providers/AIProvider.js";
import type { IBackgroundRunner } from "../../shared/background/BackgroundRunner.js";
import { MetaWhatsAppClient } from "./infrastructure/clients/MetaWhatsAppClient.js";
import { PostgresInboundMessageRepository } from "./infrastructure/persistence/PostgresInboundMessageRepository.js";
import type { WhatsAppClient } from "./application/providers/WhatsAppClient.js";
import { ReceiveWhatsAppMessageUseCase } from "./application/use-cases/ReceiveWhatsAppMessageUseCase.js";
import { WhatsAppWebhookController } from "./presentation/WhatsAppWebhookController.js";
import { buildWhatsAppRouter } from "./presentation/whatsapp.routes.js";
import { createVerifyMetaSignature } from "./presentation/middlewares/verifyMetaSignature.js";

export interface WhatsAppModuleConfig {
  verifyToken: string | undefined;
  accessToken: string | undefined;
  appSecret: string | undefined;
  apiVersion: string;
}

export function createWhatsAppModule(
  db: IDbClient,
  logger: ILogger,
  config: WhatsAppModuleConfig,
  sendMessageUseCase: SendMessageUseCase,
  aiProvider: AIProvider,
  backgroundRunner: IBackgroundRunner,
  whatsAppClientOverride?: WhatsAppClient,
): { router: Router } {
  const businessRepository = new PostgresBusinessRepository(db);
  const clientRepository = new PostgresClientRepository(db);
  const conversationRepository = new PostgresConversationRepository(db);
  const inboundMessageRepository = new PostgresInboundMessageRepository(db);
  const whatsAppClient =
    whatsAppClientOverride ?? new MetaWhatsAppClient(config.accessToken, config.apiVersion);

  const receiveUseCase = new ReceiveWhatsAppMessageUseCase(
    businessRepository,
    clientRepository,
    conversationRepository,
    sendMessageUseCase,
    whatsAppClient,
    aiProvider,
    inboundMessageRepository,
    logger,
  );

  const controller = new WhatsAppWebhookController(
    config.verifyToken,
    receiveUseCase,
    backgroundRunner,
    logger,
  );
  const verifySignature = createVerifyMetaSignature(config.appSecret);

  return { router: buildWhatsAppRouter(controller, verifySignature) };
}
