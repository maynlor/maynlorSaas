import type { Subscription } from "../../domain/Subscription.js";
import type { Plan } from "../../domain/Plan.js";
import type { SubscriptionOutputDTO } from "../dtos/SubscriptionDTO.js";
import { PlanMapper } from "./PlanMapper.js";

export class SubscriptionMapper {
  static toDTO(subscription: Subscription, plan: Plan): SubscriptionOutputDTO {
    return {
      id: subscription.id,
      businessId: subscription.businessId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      canceledAt: subscription.canceledAt ? subscription.canceledAt.toISOString() : null,
      graceEndsAt: subscription.graceEndsAt ? subscription.graceEndsAt.toISOString() : null,
      plan: PlanMapper.toDTO(plan),
    };
  }
}
