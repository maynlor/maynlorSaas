import type { Plan } from "../../domain/Plan.js";
import type { PlanOutputDTO } from "../dtos/PlanDTO.js";

export class PlanMapper {
  static toDTO(plan: Plan): PlanOutputDTO {
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      currency: plan.currency,
      limits: plan.limits.toProps(),
      isActive: plan.isActive,
    };
  }
}
