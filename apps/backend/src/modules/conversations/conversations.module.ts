import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { AIProvider } from "../ai/application/providers/AIProvider.js";
import { PostgresBusinessRepository } from "../businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresClientRepository } from "../clients/infrastructure/persistence/PostgresClientRepository.js";
import { PostgresConversationRepository } from "./infrastructure/persistence/PostgresConversationRepository.js";
import { PostgresMessageRepository } from "./infrastructure/persistence/PostgresMessageRepository.js";
import { SendMessageUseCase, type AIToolsFactory } from "./application/use-cases/SendMessageUseCase.js";
import { ListConversationsUseCase } from "./application/use-cases/ListConversationsUseCase.js";
import { GetConversationMessagesUseCase } from "./application/use-cases/GetConversationMessagesUseCase.js";
import { SendManualReplyUseCase } from "./application/use-cases/SendManualReplyUseCase.js";
import { SetBotPausedUseCase } from "./application/use-cases/SetBotPausedUseCase.js";
import type { ConversationChannelSender } from "./application/providers/ConversationChannelSender.js";
import { ConversationController } from "./presentation/ConversationController.js";
import { buildConversationRouter } from "./presentation/conversation.routes.js";
import type { PlanLimitReader } from "../subscriptions/application/services/PlanLimitReader.js";
import type { ProductTracker } from "../../shared/telemetry/ProductTracker.js";
import { NoopProductTracker } from "../../shared/telemetry/NoopProductTracker.js";

export function createConversationsModule(
  db: IDbClient,
  authenticate: RequestHandler,
  aiProvider: AIProvider,
  planLimitReader: PlanLimitReader,
  channelSender: ConversationChannelSender,
  toolsFactory?: AIToolsFactory,
  tracker: ProductTracker = new NoopProductTracker(),
): { router: Router; sendMessageUseCase: SendMessageUseCase } {
  const businessRepository = new PostgresBusinessRepository(db);
  const clientRepository = new PostgresClientRepository(db);
  const conversationRepository = new PostgresConversationRepository(db);
  const messageRepository = new PostgresMessageRepository(db);

  const sendMessageUseCase = new SendMessageUseCase(
    businessRepository,
    clientRepository,
    conversationRepository,
    messageRepository,
    aiProvider,
    planLimitReader,
    toolsFactory,
    tracker,
  );
  const listUseCase = new ListConversationsUseCase(conversationRepository);
  const getMessagesUseCase = new GetConversationMessagesUseCase(
    conversationRepository,
    messageRepository,
  );

  const sendManualReplyUseCase = new SendManualReplyUseCase(
    conversationRepository,
    messageRepository,
    channelSender,
    tracker,
  );
  const setBotPausedUseCase = new SetBotPausedUseCase(conversationRepository);

  const controller = new ConversationController(
    sendMessageUseCase,
    listUseCase,
    getMessagesUseCase,
    sendManualReplyUseCase,
    setBotPausedUseCase,
  );

  return { router: buildConversationRouter(controller, authenticate), sendMessageUseCase };
}
