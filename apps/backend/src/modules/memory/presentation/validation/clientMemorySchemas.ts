import { z } from "zod";

export const createClientMemorySchema = z.object({
  params: z.object({ clientId: z.string().uuid() }),
  body: z.object({
    content: z.string().min(1).max(500),
  }),
  query: z.object({}).optional(),
});

export const listClientMemoriesSchema = z.object({
  params: z.object({ clientId: z.string().uuid() }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const deleteClientMemorySchema = z.object({
  params: z.object({ clientId: z.string().uuid(), id: z.string().uuid() }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});
