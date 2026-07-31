import type { ErrorReporter } from "./ErrorReporter.js";

/**
 * Sin `SENTRY_DSN` no se reporta nada. Mismo criterio que
 * `ManualPaymentProvider` o `NoopProductTracker`: una integración opcional sin
 * configurar no debe romper el arranque ni obligar a los tests a conocerla.
 */
export class NoopErrorReporter implements ErrorReporter {
  captureError(): void {
    // Intencionalmente vacío.
  }
}
