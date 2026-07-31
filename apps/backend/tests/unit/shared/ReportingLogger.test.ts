import { describe, it, expect, vi } from "vitest";
import { ReportingLogger } from "@shared/logger/ReportingLogger.js";
import type { ILogger } from "@shared/logger/Logger.js";
import type { ErrorReporter } from "@shared/errors/ErrorReporter.js";

function build() {
  const inner: ILogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  const reporter: ErrorReporter = { captureError: vi.fn() };
  return { inner, reporter, logger: new ReportingLogger(inner, reporter) };
}

describe("ReportingLogger", () => {
  it("reports errors that a use case swallowed and logged, not just thrown ones", () => {
    // Este es el caso que motivó el decorador: el envío de WhatsApp falla, el
    // caso de uso lo captura para poder ackear a Meta, y sin esto nadie se
    // entera de que el negocio quedó mudo.
    const { logger, inner, reporter } = build();

    logger.error("Failed to send the WhatsApp reply", { businessId: "b1", reason: "code 190" });

    expect(inner.error).toHaveBeenCalledWith("Failed to send the WhatsApp reply", {
      businessId: "b1",
      reason: "code 190",
    });
    expect(reporter.captureError).toHaveBeenCalledWith("Failed to send the WhatsApp reply", {
      businessId: "b1",
      reason: "code 190",
    });
  });

  it("does not report info, warn or debug", () => {
    const { logger, reporter } = build();

    logger.info("Server listening on port 3000");
    logger.warn("Received an unsupported WhatsApp message; ignoring");
    logger.debug("whatever");

    expect(reporter.captureError).not.toHaveBeenCalled();
  });

  it("still logs locally when the reporter throws", () => {
    // El log local es la fuente de verdad. Un fallo del servicio externo no
    // puede tapar el error original ni tumbar el proceso.
    const { logger, inner, reporter } = build();
    reporter.captureError = vi.fn(() => {
      throw new Error("sentry unreachable");
    });

    expect(() => logger.error("something broke")).not.toThrow();
    expect(inner.error).toHaveBeenCalledWith("something broke", undefined);
  });

  it("forwards the other levels untouched", () => {
    const { logger, inner } = build();

    logger.info("a", { x: 1 });
    logger.warn("b");
    logger.debug("c");

    expect(inner.info).toHaveBeenCalledWith("a", { x: 1 });
    expect(inner.warn).toHaveBeenCalledWith("b", undefined);
    expect(inner.debug).toHaveBeenCalledWith("c", undefined);
  });
});
