import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { Subscription } from "../../domain/Subscription.js";
import type { ISubscriptionRepository } from "../../application/repositories/ISubscriptionRepository.js";
import { SubscriptionFactory, type SubscriptionRow } from "../factories/SubscriptionFactory.js";

export class PostgresSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly db: IDbClient) {}

  async save(subscription: Subscription): Promise<void> {
    await this.db.query(
      `INSERT INTO subscriptions (id, business_id, plan_id, status, provider, external_id, current_period_start, current_period_end, grace_ends_at, canceled_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         provider = EXCLUDED.provider,
         external_id = EXCLUDED.external_id,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         grace_ends_at = EXCLUDED.grace_ends_at,
         canceled_at = EXCLUDED.canceled_at,
         updated_at = EXCLUDED.updated_at`,
      [
        subscription.id,
        subscription.businessId,
        subscription.planId,
        subscription.status,
        subscription.provider,
        subscription.externalId,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        subscription.graceEndsAt,
        subscription.canceledAt,
        subscription.createdAt,
        subscription.updatedAt,
      ],
    );
  }

  async findCurrentByBusinessId(businessId: string): Promise<Subscription | null> {
    const result = await this.db.query<SubscriptionRow>(
      `SELECT * FROM subscriptions
       WHERE business_id = $1 AND status IN ('pending', 'trialing', 'active', 'past_due')
       ORDER BY created_at DESC
       LIMIT 1`,
      [businessId],
    );
    const row = result.rows[0];
    return row ? SubscriptionFactory.toDomain(row) : null;
  }

  async findByExternalId(provider: string, externalId: string): Promise<Subscription | null> {
    const result = await this.db.query<SubscriptionRow>(
      `SELECT * FROM subscriptions WHERE provider = $1 AND external_id = $2 LIMIT 1`,
      [provider, externalId],
    );
    const row = result.rows[0];
    return row ? SubscriptionFactory.toDomain(row) : null;
  }
}
