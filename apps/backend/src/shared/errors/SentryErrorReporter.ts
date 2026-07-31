import * as Sentry from "@sentry/node";
import type { ErrorReporter } from "./ErrorReporter.js";
import { redactContext } from "./redactContext.js";

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string | undefined;
}

/**
 * Inicializa Sentry. Debe llamarse una sola vez, antes de construir la app.
 *
 * `sendDefaultPii` queda en false a propósito: sin eso el SDK adjunta solo por
 * su cuenta headers, cookies y datos del usuario de cada request. Todo lo que
 * viaja pasa por `redactContext`, y nada más.
 */
export function initSentry(config: SentryConfig): void {
  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    ...(config.release && { release: config.release }),
    sendDefaultPii: false,
    // El objetivo es saber qué se rompe, no medir rendimiento; trazar cada
    // request costaría cuota sin aportar a eso.
    tracesSampleRate: 0,
  });
}

export class SentryErrorReporter implements ErrorReporter {
  captureError(message: string, context?: object): void {
    Sentry.captureMessage(message, {
      level: "error",
      ...(context && { extra: redactContext(context) as Record<string, unknown> }),
    });
  }
}
