import { z } from "zod";

export const sendMessageSchema = z.object({
  body: z
    .object({
      message: z.string().min(1).max(2000),
      conversationId: z.string().uuid().optional(),
      clientId: z.string().uuid().optional(),
    })
    .refine((data) => data.conversationId !== undefined || data.clientId !== undefined, {
      message: "clientId is required when conversationId is not provided",
      path: ["clientId"],
    }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listConversationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getConversationMessagesSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  }),
  body: z.object({}).optional(),
});
