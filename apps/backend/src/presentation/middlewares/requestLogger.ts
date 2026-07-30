import type { NextFunction, Request, Response } from "express";
import type { ILogger } from "../../shared/logger/Logger.js";

export function createRequestLogger(logger: ILogger) {
  return function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    res.on("finish", () => {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
        durationMs: Date.now() - start,
      });
    });
    next();
  };
}
