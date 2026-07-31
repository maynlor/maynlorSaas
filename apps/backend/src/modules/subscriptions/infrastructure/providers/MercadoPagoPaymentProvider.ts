import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentProvider,
  ProviderWebhookEvent,
} from "../../application/providers/PaymentProvider.js";
import type { SubscriptionStatus } from "../../domain/Subscription.js";
import type { SubscriptionPaymentStatus } from "../../domain/SubscriptionPayment.js";

const MP_API_BASE = "https://api.mercadopago.com";
const BILLING_PERIOD_DAYS = 30;

/** Cambios de estado de la suscripción (autorizada, pausada, cancelada). */
const TOPIC_PREAPPROVAL = "preapproval";
/** Cobro recurrente ejecutado sobre una suscripción ya autorizada. */
const TOPIC_AUTHORIZED_PAYMENT = "subscription_authorized_payment";

interface MercadoPagoPreapproval {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  init_point?: string;
  date_created: string;
  /** Fecha del próximo cobro; avanza en cada renovación. */
  next_payment_date?: string;
  auto_recurring?: { transaction_amount: number; currency_id?: string };
}

/** Respuesta de `GET /authorized_payments/{id}`: un cargo puntual de la suscripción. */
interface MercadoPagoAuthorizedPayment {
  id: number | string;
  preapproval_id: string;
  transaction_amount?: number;
  currency_id?: string;
  date_created?: string;
  debit_date?: string;
  payment?: { id?: number | string; status?: string };
}

function addBillingPeriod(from: Date, periods = 1): Date {
  const result = new Date(from);
  result.setDate(result.getDate() + BILLING_PERIOD_DAYS * periods);
  return result;
}

interface MercadoPagoWebhookPayload {
  type?: string;
  action?: string;
  data?: { id?: string };
}

function mapPreapprovalStatus(status: MercadoPagoPreapproval["status"]): SubscriptionStatus {
  switch (status) {
    case "authorized":
      return "active";
    case "paused":
      return "past_due";
    case "cancelled":
      return "canceled";
    case "pending":
    default:
      return "pending";
  }
}

function mapPaymentStatus(status: string | undefined): SubscriptionPaymentStatus {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
    case "cancelled":
      return "rejected";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

/**
 * Cobro real de suscripciones recurrentes vía la API de Preapproval de
 * Mercado Pago (Checkout Pro): el negocio autoriza el cobro en MP y el
 * estado se confirma después por webhook, ya que la API no confirma pagos
 * de forma síncrona.
 */
export class MercadoPagoPaymentProvider implements PaymentProvider {
  constructor(
    private readonly accessToken: string,
    /** Obligatorio: sin él no podríamos distinguir una notificación real de MP de una falsificada. */
    private readonly webhookSecret: string,
    private readonly backUrl: string,
  ) {}

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const currentPeriodStart = new Date();

    if (!input.plan.priceMonthly) {
      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + BILLING_PERIOD_DAYS);
      return {
        status: "active",
        provider: "manual",
        externalId: null,
        checkoutUrl: null,
        currentPeriodStart,
        currentPeriodEnd,
      };
    }

    const requestBody = {
      reason: `Suscripcion ${input.plan.name}`,
      external_reference: input.businessId,
      payer_email: input.payerEmail,
      back_url: this.backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: input.plan.priceMonthly,
        currency_id: input.plan.currency,
      },
    };
    const response = await fetch(`${MP_API_BASE}/preapproval`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(
        `Mercado Pago preapproval request failed with status ${response.status}: ${await response.text()}`,
      );
    }

    const preapproval = (await response.json()) as MercadoPagoPreapproval;
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + BILLING_PERIOD_DAYS);

    return {
      status: mapPreapprovalStatus(preapproval.status),
      provider: "mercadopago",
      externalId: preapproval.id,
      checkoutUrl: preapproval.init_point ?? null,
      currentPeriodStart,
      currentPeriodEnd,
    };
  }

  async cancelSubscription(provider: string, externalId: string | null): Promise<void> {
    if (provider !== "mercadopago" || !externalId) return;

    const response = await fetch(`${MP_API_BASE}/preapproval/${externalId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ status: "cancelled" }),
    });

    if (!response.ok) {
      throw new Error(`Mercado Pago preapproval cancellation failed with status ${response.status}`);
    }
  }

  async parseWebhookEvent(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<ProviderWebhookEvent | null> {
    const payload = safeParseJson(rawBody);
    const topic = payload?.type;
    if (!payload?.data?.id || (topic !== TOPIC_PREAPPROVAL && topic !== TOPIC_AUTHORIZED_PAYMENT)) {
      return null;
    }

    const signatureHeader = firstHeader(headers["x-signature"]);
    const requestId = firstHeader(headers["x-request-id"]);
    if (!signatureHeader || !this.isValidSignature(signatureHeader, requestId, payload.data.id)) {
      throw new Error("Invalid Mercado Pago webhook signature");
    }

    return topic === TOPIC_PREAPPROVAL
      ? this.fetchSubscriptionEvent(payload.data.id)
      : this.fetchPaymentEvent(payload.data.id);
  }

  private async fetchSubscriptionEvent(preapprovalId: string): Promise<ProviderWebhookEvent> {
    const preapproval = await this.get<MercadoPagoPreapproval>(`/preapproval/${preapprovalId}`, "preapproval lookup");

    // `next_payment_date` avanza en cada renovación; derivarlo de `date_created`
    // dejaría la fecha de vencimiento congelada en el primer período.
    const currentPeriodEnd = preapproval.next_payment_date
      ? new Date(preapproval.next_payment_date)
      : addBillingPeriod(new Date());

    return {
      kind: "subscription",
      externalId: preapproval.id,
      status: mapPreapprovalStatus(preapproval.status),
      currentPeriodStart: addBillingPeriod(currentPeriodEnd, -1),
      currentPeriodEnd,
    };
  }

  private async fetchPaymentEvent(authorizedPaymentId: string): Promise<ProviderWebhookEvent> {
    const authorized = await this.get<MercadoPagoAuthorizedPayment>(
      `/authorized_payments/${authorizedPaymentId}`,
      "authorized payment lookup",
    );

    return {
      kind: "payment",
      subscriptionExternalId: authorized.preapproval_id,
      externalId: String(authorized.id),
      status: mapPaymentStatus(authorized.payment?.status),
      amount: authorized.transaction_amount ?? 0,
      currency: authorized.currency_id ?? "ARS",
      processedAt: new Date(authorized.debit_date ?? authorized.date_created ?? Date.now()),
    };
  }

  private async get<T>(path: string, description: string): Promise<T> {
    const response = await fetch(`${MP_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Mercado Pago ${description} failed with status ${response.status}`);
    }
    return (await response.json()) as T;
  }

  private isValidSignature(signatureHeader: string, requestId: string | undefined, dataId: string): boolean {
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((part) => {
        const [key, value] = part.split("=").map((s) => s.trim());
        return [key, value];
      }),
    );
    const ts = parts.ts;
    const receivedHash = parts.v1;
    if (!ts || !receivedHash) return false;

    const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
    const expectedHash = createHmac("sha256", this.webhookSecret).update(manifest).digest("hex");

    const expected = Buffer.from(expectedHash);
    const actual = Buffer.from(receivedHash);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeParseJson(rawBody: Buffer): MercadoPagoWebhookPayload | null {
  try {
    return JSON.parse(rawBody.toString("utf-8")) as MercadoPagoWebhookPayload;
  } catch {
    return null;
  }
}
