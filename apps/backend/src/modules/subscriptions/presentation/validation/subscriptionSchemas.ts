import { z } from "zod";

export const createSubscriptionSchema = z.object({
  body: z.object({
    planSlug: z.string().min(1).max(60),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
