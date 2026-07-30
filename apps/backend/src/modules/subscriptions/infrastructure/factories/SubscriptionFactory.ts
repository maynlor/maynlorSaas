import { Subscription, type SubscriptionStatus } from "../../domain/Subscription.js";

export interface SubscriptionRow {
  id: string;
  business_id: string;
  plan_id: string;
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  canceled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export class SubscriptionFactory {
  static toDomain(row: SubscriptionRow): Subscription {
    return Subscription.reconstitute({
      id: row.id,
      businessId: row.business_id,
      planId: row.plan_id,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      canceledAt: row.canceled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
