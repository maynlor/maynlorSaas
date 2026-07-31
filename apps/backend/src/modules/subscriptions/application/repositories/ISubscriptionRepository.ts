import type { Subscription } from "../../domain/Subscription.js";

export interface ISubscriptionRepository {
  save(subscription: Subscription): Promise<void>;
  findCurrentByBusinessId(businessId: string): Promise<Subscription | null>;
  findByExternalId(provider: string, externalId: string): Promise<Subscription | null>;
}
