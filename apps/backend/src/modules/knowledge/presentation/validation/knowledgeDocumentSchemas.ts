import { z } from "zod";

const idParams = z.object({ id: z.string().uuid() });

export const uploadTextKnowledgeDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    content: z.string().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const listKnowledgeDocumentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const deleteKnowledgeDocumentSchema = z.object({
  params: idParams,
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

/** El título llega como campo de texto junto al archivo; no pasa por `validate` porque multer puebla `req.body` después del JSON parser. */
export const uploadPdfTitleSchema = z.object({ title: z.string().min(1).max(200) });
