import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  ProviderWebhookEvent,
} from "../../application/providers/PaymentProvider.js";

const BILLING_PERIOD_DAYS = 30;

/**
 * Implementación por defecto mientras no haya un proveedor de cobro real
 * conectado (Mercado Pago, Stripe, etc.): activa la suscripción de inmediato
 * sin cobrar. Reemplazable sin tocar el resto del dominio.
 */
export class ManualPaymentProvider implements PaymentProvider {
  createCheckout(_input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + BILLING_PERIOD_DAYS);

    return Promise.resolve({
      status: "active",
      provider: "manual",
      externalId: null,
      checkoutUrl: null,
      currentPeriodStart,
      currentPeriodEnd,
    });
  }

  cancelSubscription(): Promise<void> {
    return Promise.resolve();
  }

  parseWebhookEvent(): Promise<ProviderWebhookEvent | null> {
    return Promise.resolve(null);
  }
}
