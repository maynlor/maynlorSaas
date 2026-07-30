import { z } from "zod";

const idParams = z.object({ id: z.string().uuid() });

export const createFaqSchema = z.object({
  body: z.object({
    question: z.string().min(5).max(300),
    answer: z.string().min(1).max(5000),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateFaqSchema = z.object({
  params: idParams,
  body: z
    .object({
      question: z.string().min(5).max(300).optional(),
      answer: z.string().min(1).max(5000).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    }),
  query: z.object({}).optional(),
});

export const getFaqByIdSchema = z.object({
  params: idParams,
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const deleteFaqSchema = getFaqByIdSchema;

export const listFaqsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});
