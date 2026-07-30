import { Router, type RequestHandler } from "express";
import type { ConversationController } from "./ConversationController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import {
  sendMessageSchema,
  listConversationsSchema,
  getConversationMessagesSchema,
} from "./validation/conversationSchemas.js";

export function buildConversationRouter(
  controller: ConversationController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/messages", validate(sendMessageSchema), controller.sendMessage);
  router.get("/:id/messages", validate(getConversationMessagesSchema), controller.getMessages);
  router.get("/", validate(listConversationsSchema), controller.list);

  return router;
}
