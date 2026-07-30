import { z } from "zod";

export const createClientSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    phone: z.string().min(3).max(30).optional(),
    email: z.string().email().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getClientByIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const listClientsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});
