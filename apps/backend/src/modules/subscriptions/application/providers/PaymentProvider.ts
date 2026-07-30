import type { Plan } from "../../domain/Plan.js";
import type { SubscriptionStatus } from "../../domain/Subscription.js";

export interface ActivateSubscriptionInput {
  businessId: string;
  plan: Plan;
}

export interface ActivateSubscriptionResult {
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

/**
 * Abstrae el cobro real (Mercado Pago, Stripe, etc.) del resto del dominio.
 * Mientras no haya un proveedor conectado, `ManualPaymentProvider` activa la
 * suscripción sin cobrar, para no bloquear el resto de la plataforma.
 */
export interface PaymentProvider {
  activateSubscription(input: ActivateSubscriptionInput): Promise<ActivateSubscriptionResult>;
}
