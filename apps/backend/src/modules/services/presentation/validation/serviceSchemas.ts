import { z } from "zod";

const idParams = z.object({ id: z.string().uuid() });

export const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150),
    description: z.string().max(2000).optional(),
    price: z.number().nonnegative(),
    currency: z.string().length(3).optional(),
    durationMinutes: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateServiceSchema = z.object({
  params: idParams,
  body: z
    .object({
      name: z.string().min(2).max(150).optional(),
      description: z.string().max(2000).nullable().optional(),
      price: z.number().nonnegative().optional(),
      currency: z.string().length(3).optional(),
      durationMinutes: z.number().int().positive().nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    }),
  query: z.object({}).optional(),
});

export const getServiceByIdSchema = z.object({
  params: idParams,
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const deleteServiceSchema = getServiceByIdSchema;

export const listServicesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});
