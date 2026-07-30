import type { ISubscriptionRepository } from "../repositories/ISubscriptionRepository.js";
import type { IPlanRepository } from "../repositories/IPlanRepository.js";

export type LimitedResource = "products" | "services" | "conversations";

/**
 * Resuelve el límite vigente de un negocio para un recurso dado.
 * Un negocio sin suscripción activa se trata como ilimitado: registrarse no
 * requiere elegir un plan todavía, y bloquear por completo sería peor que no
 * aplicar límites. Cuando exista alta automática de plan al registrarse, este
 * caso dejará de ocurrir en la práctica.
 */
export class PlanLimitReader {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
  ) {}

  async getLimit(businessId: string, resource: LimitedResource): Promise<number | null> {
    const subscription = await this.subscriptionRepository.findCurrentByBusinessId(businessId);
    if (!subscription) return null;

    const plan = await this.planRepository.findById(subscription.planId);
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
}
