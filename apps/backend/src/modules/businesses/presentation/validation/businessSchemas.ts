import { z } from "zod";

export const linkWhatsAppSchema = z.object({
  body: z.object({
    phoneNumberId: z.string().min(1).max(64),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
