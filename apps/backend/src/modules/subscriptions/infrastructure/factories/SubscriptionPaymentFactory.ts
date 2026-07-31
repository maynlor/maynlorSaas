import type { SubscriptionProvider } from "../../domain/Subscription.js";
import {
  SubscriptionPayment,
  type SubscriptionPaymentStatus,
} from "../../domain/SubscriptionPayment.js";

export interface SubscriptionPaymentRow {
  id: string;
  subscription_id: string;
  business_id: string;
  provider: string;
  external_id: string;
  status: string;
  amount: string;
  currency: string;
  processed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class SubscriptionPaymentFactory {
  static toDomain(row: SubscriptionPaymentRow): SubscriptionPayment {
    return SubscriptionPayment.reconstitute({
      id: row.id,
      subscriptionId: row.subscription_id,
      businessId: row.business_id,
      provider: row.provider as SubscriptionProvider,
      externalId: row.external_id,
      status: row.status as SubscriptionPaymentStatus,
      // NUMERIC llega como string desde pg para no perder precisión.
      amount: Number(row.amount),
      currency: row.currency,
      processedAt: row.processed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
