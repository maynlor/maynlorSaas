import type { SubscriptionStatus } from "../../domain/Subscription.js";
import type { PlanOutputDTO } from "./PlanDTO.js";

export interface CreateSubscriptionInputDTO {
  planSlug: string;
}

export interface SubscriptionOutputDTO {
  id: string;
  businessId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  /** Si el cobro falló, hasta cuándo conserva el plan antes de caer al gratis. */
  graceEndsAt: string | null;
  plan: PlanOutputDTO;
  /** URL a la que redirigir para autorizar el cobro. Presente solo justo después de crear un checkout pago. */
  checkoutUrl?: string | null;
}
