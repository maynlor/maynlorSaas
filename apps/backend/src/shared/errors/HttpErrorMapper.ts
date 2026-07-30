import type { Response } from "express";
import { AppError } from "./AppError.js";

export function mapErrorToHttpResponse(err: unknown, res: Response): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error",
    },
  });
}
