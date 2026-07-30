import { z } from "zod";

const idParams = z.object({ id: z.string().uuid() });

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150),
    description: z.string().max(2000).optional(),
    price: z.number().nonnegative(),
    currency: z.string().length(3).optional(),
    stock: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateProductSchema = z.object({
  params: idParams,
  body: z
    .object({
      name: z.string().min(2).max(150).optional(),
      description: z.string().max(2000).nullable().optional(),
      price: z.number().nonnegative().optional(),
      currency: z.string().length(3).optional(),
      stock: z.number().int().min(0).nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    }),
  query: z.object({}).optional(),
});

export const getProductByIdSchema = z.object({
  params: idParams,
  body: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const deleteProductSchema = getProductByIdSchema;

export const listProductsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});
