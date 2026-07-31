import type { Plan } from "../../domain/Plan.js";
import type { SubscriptionProvider, SubscriptionStatus } from "../../domain/Subscription.js";
import type { SubscriptionPaymentStatus } from "../../domain/SubscriptionPayment.js";

export interface CreateCheckoutInput {
  businessId: string;
  plan: Plan;
  payerEmail: string;
}

export interface CreateCheckoutResult {
  status: SubscriptionStatus;
  provider: SubscriptionProvider;
  externalId: string | null;
  /** URL a la que redirigir al negocio para autorizar el cobro. Null si se activó sin checkout (ej. plan gratis). */
  checkoutUrl: string | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

/** Cambió el estado de la suscripción (autorizada, pausada, cancelada). */
export interface SubscriptionWebhookEvent {
  kind: "subscription";
  externalId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

/** Se ejecutó un cobro recurrente sobre una suscripción existente. */
export interface PaymentWebhookEvent {
  kind: "payment";
  /** Id de la suscripción en el proveedor, para vincular el cobro. */
  subscriptionExternalId: string;
  externalId: string;
  status: SubscriptionPaymentStatus;
  amount: number;
  currency: string;
  processedAt: Date;
}

export type ProviderWebhookEvent = SubscriptionWebhookEvent | PaymentWebhookEvent;

/**
 * Abstrae el cobro real (Mercado Pago, Stripe, etc.) del resto del dominio.
 * `createCheckout` es async porque el cobro real requiere que el negocio
 * autorice el pago fuera de nuestra plataforma (redirect a checkout); la
 * confirmación llega después vía `parseWebhookEvent`. Mientras no haya un
 * proveedor conectado, `ManualPaymentProvider` activa sin cobrar.
 */
export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  cancelSubscription(provider: SubscriptionProvider, externalId: string | null): Promise<void>;
  /** Devuelve null si la notificación no corresponde a este proveedor o no debe procesarse. */
  parseWebhookEvent(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<ProviderWebhookEvent | null>;
}
