import { describe, it, expect, vi } from "vitest";
import type { Response } from "express";
import { createErrorHandler } from "@presentation/middlewares/errorHandler.js";
import {
  InfrastructureError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@shared/errors/AppError.js";
import type { ILogger } from "@shared/logger/Logger.js";

function build() {
  const logger: ILogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  return { logger, res, handler: createErrorHandler(logger) };
}

describe("errorHandler", () => {
  it("logs client errors as warnings, so they do not look like outages", () => {
    // Cada request sin sesión pasaba por aquí como error. Con el reporte de
    // errores enganchado al logger, un bot escaneando la API bastaría para
    // agotar la cuota y tapar las alertas reales.
    const { handler, logger, res } = build();

    handler(new UnauthorizedError("Missing bearer token"), {} as never, res, vi.fn());

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith("Missing bearer token", {
      statusCode: 401,
      code: expect.any(String),
    });
  });

  it("treats the whole 4xx family the same way", () => {
    const { handler, logger, res } = build();

    handler(new NotFoundError("Client not found"), {} as never, res, vi.fn());
    handler(new ValidationError("clientId is required"), {} as never, res, vi.fn());

    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it("still logs server errors as errors, since those are ours", () => {
    const { handler, logger, res } = build();

    handler(new InfrastructureError("AI provider request failed"), {} as never, res, vi.fn());

    expect(logger.error).toHaveBeenCalledWith("AI provider request failed", {
      stack: expect.any(String),
    });
  });

  it("logs an unexpected exception as an error with its stack", () => {
    const { handler, logger, res } = build();

    handler(new Error("boom"), {} as never, res, vi.fn());

    expect(logger.error).toHaveBeenCalledWith("boom", { stack: expect.any(String) });
  });

  it("logs something that is not even an Error", () => {
    const { handler, logger, res } = build();

    handler("just a string", {} as never, res, vi.fn());

    expect(logger.error).toHaveBeenCalledWith("Unknown error thrown", { err: "just a string" });
  });

  it("keeps answering the client with the mapped status", () => {
    const { handler, res } = build();

    handler(new NotFoundError("Client not found"), {} as never, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
