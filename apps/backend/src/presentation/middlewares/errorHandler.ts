import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";
import { describeError } from "../../shared/errors/describeError.js";
import { mapErrorToHttpResponse } from "../../shared/errors/HttpErrorMapper.js";
import type { ILogger } from "../../shared/logger/Logger.js";

/**
 * Un 4xx es el sistema funcionando: el cliente mandó algo inválido, no tiene
 * sesión, o pidió algo que no existe. Loguearlo como error hace que un bot
 * escaneando la API, una sesión vencida o la sonda de Render se vean igual que
 * una caída real — y, con el reporte de errores enganchado al logger, además
 * consume la cuota y entierra las alertas que sí importan.
 *
 * Los 5xx sí son nuestros: algo se rompió y nadie lo previó.
 */
function asClientError(err: unknown): AppError | null {
  return err instanceof AppError && err.statusCode >= 400 && err.statusCode < 500 ? err : null;
}

export function createErrorHandler(logger: ILogger) {
  return function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    const clientError = asClientError(err);

    if (clientError) {
      logger.warn(clientError.message, {
        statusCode: clientError.statusCode,
        code: clientError.code,
      });
    } else if (!(err instanceof Error)) {
      logger.error("Unknown error thrown", { err });
    } else {
      logger.error(describeError(err), { stack: err.stack });
    }

    mapErrorToHttpResponse(err, res);
  };
}
