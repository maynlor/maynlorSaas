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
  plan: PlanOutputDTO;
}
