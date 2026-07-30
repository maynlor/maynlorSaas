import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ValidationError } from "../../shared/errors/AppError.js";

export function validate(schema: ZodSchema) {
  return function validationMiddleware(req: Request, _res: Response, next: NextFunction): void {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      next(new ValidationError("Invalid request", result.error.flatten()));
      return;
    }
    const parsed = result.data as { body?: unknown; query?: unknown; params?: unknown };
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) Object.assign(req.query, parsed.query);
    if (parsed.params !== undefined) Object.assign(req.params, parsed.params);
    next();
  };
}
