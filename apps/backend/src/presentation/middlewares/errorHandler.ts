import type { NextFunction, Request, Response } from "express";
import { mapErrorToHttpResponse } from "../../shared/errors/HttpErrorMapper.js";
import type { ILogger } from "../../shared/logger/Logger.js";

export function createErrorHandler(logger: ILogger) {
  return function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    if (!(err instanceof Error)) {
      logger.error("Unknown error thrown", { err });
    } else {
      logger.error(err.message, { stack: err.stack });
    }
    mapErrorToHttpResponse(err, res);
  };
}
