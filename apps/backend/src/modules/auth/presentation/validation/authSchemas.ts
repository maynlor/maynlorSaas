import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    business: z.object({
      name: z.string().min(2).max(120),
      email: z.string().email(),
      slug: z
        .string()
        .min(2)
        .max(140)
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lowercase kebab-case"),
    }),
    user: z.object({
      email: z.string().email(),
      password: z.string().min(8).max(72),
    }),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
