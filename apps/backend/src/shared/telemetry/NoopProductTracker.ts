import type { ProductTracker } from "./ProductTracker.js";

/** Usado cuando POSTHOG_API_KEY no está configurada — mismo patrón que ManualPaymentProvider. */
export class NoopProductTracker implements ProductTracker {
  track(): void {
    // no-op
  }

  identify(): void {
    // no-op
  }
}
