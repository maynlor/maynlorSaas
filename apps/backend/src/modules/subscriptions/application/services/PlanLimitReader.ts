import type { ILogger } from "../../../../shared/logger/Logger.js";
import type { Plan } from "../../domain/Plan.js";
import type { ISubscriptionRepository } from "../repositories/ISubscriptionRepository.js";
import type { IPlanRepository } from "../repositories/IPlanRepository.js";

export type LimitedResource = "products" | "services" | "conversations";

/** Plan al que cae un negocio sin suscripción paga vigente. */
export const FALLBACK_PLAN_SLUG = "starter";

/**
 * Resuelve el límite vigente de un negocio para un recurso dado.
 *
 * Un negocio sin suscripción que otorgue acceso (nunca contrató, canceló, o
 * su checkout quedó `pending`) no queda sin límites: se le aplican los del
 * plan gratis. Devolver "ilimitado" en ese caso permitiría obtener acceso
 * total simplemente cancelando la suscripción o abandonando un checkout.
 */
export class PlanLimitReader {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
    private readonly logger: ILogger,
  ) {}

  async getLimit(businessId: string, resource: LimitedResource): Promise<number | null> {
    const plan = await this.resolvePlan(businessId);
    if (!plan) return null;

    switch (resource) {
      case "products":
        return plan.limits.maxProducts;
      case "services":
        return plan.limits.maxServices;
      case "conversations":
        return plan.limits.maxConversationsPerMonth;
    }
  }

  private async resolvePlan(businessId: string): Promise<Plan | null> {
    const subscription = await this.subscriptionRepository.findCurrentByBusinessId(businessId);

    if (subscription?.grantsPlanAccessAt(new Date())) {
      const plan = await this.planRepository.findById(subscription.planId);
      if (plan) return plan;
      this.logger.warn("Subscribed plan no longer exists; falling back to the free plan", {
        businessId,
        planId: subscription.planId,
      });
    }

    const fallback = await this.planRepository.findBySlug(FALLBACK_PLAN_SLUG);
    if (!fallback) {
      // Entorno sin el catálogo de planes sembrado: no podemos derivar límites.
      // Es un error de configuración, no algo que un usuario pueda provocar.
      this.logger.warn(`Fallback plan "${FALLBACK_PLAN_SLUG}" not found; limits are not being enforced`, {
        businessId,
      });
      return null;
    }
    return fallback;
  }
}
