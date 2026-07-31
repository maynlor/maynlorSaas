import { Router, type RequestHandler } from "express";
import type { ConversationController } from "./ConversationController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import {
  sendMessageSchema,
  listConversationsSchema,
  getConversationMessagesSchema,
  sendManualReplySchema,
  setBotPausedSchema,
} from "./validation/conversationSchemas.js";

export function buildConversationRouter(
  controller: ConversationController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/messages", validate(sendMessageSchema), controller.sendMessage);
  router.get("/:id/messages", validate(getConversationMessagesSchema), controller.getMessages);
  router.post("/:id/reply", validate(sendManualReplySchema), controller.sendManualReply);
  router.patch("/:id/bot", validate(setBotPausedSchema), controller.setBotPaused);
  router.get("/", validate(listConversationsSchema), controller.list);

  return router;
}
