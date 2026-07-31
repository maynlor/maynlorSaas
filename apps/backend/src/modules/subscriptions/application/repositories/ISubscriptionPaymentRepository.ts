import type { SubscriptionPayment } from "../../domain/SubscriptionPayment.js";

export interface ISubscriptionPaymentRepository {
  /**
   * Idempotente por `(provider, externalId)`: los proveedores reintentan los
   * webhooks, así que el mismo cobro puede llegar varias veces.
   */
  save(payment: SubscriptionPayment): Promise<void>;
  findByBusinessId(businessId: string, limit: number): Promise<SubscriptionPayment[]>;
}
