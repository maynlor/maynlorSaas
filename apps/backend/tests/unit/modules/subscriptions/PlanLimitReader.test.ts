import { describe, it, expect, vi } from "vitest";
import { PlanLimitReader } from "@modules/subscriptions/application/services/PlanLimitReader.js";
import { Plan } from "@modules/subscriptions/domain/Plan.js";
import { Subscription, type SubscriptionStatus } from "@modules/subscriptions/domain/Subscription.js";
import type { IPlanRepository } from "@modules/subscriptions/application/repositories/IPlanRepository.js";
import type { ISubscriptionRepository } from "@modules/subscriptions/application/repositories/ISubscriptionRepository.js";
import type { ILogger } from "@shared/logger/Logger.js";

const businessId = "b1";

const noopLogger: ILogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

function buildPlan(slug: string, maxProducts: number | null): Plan {
  return Plan.reconstitute({
    id: `plan-${slug}`,
    name: slug,
    slug,
    description: null,
    priceMonthly: slug === "starter" ? 0 : 15000,
    currency: "ARS",
    limits: { maxProducts, maxServices: 10, maxUsers: 1, maxConversationsPerMonth: 200 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).value;
}

const STARTER = buildPlan("starter", 20);
const ENTERPRISE = buildPlan("enterprise", null);

function planRepoMock(overrides: Partial<IPlanRepository> = {}): IPlanRepository {
  return {
    findAllActive: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(ENTERPRISE),
    findBySlug: vi.fn().mockResolvedValue(STARTER),
    ...overrides,
  };
}

function subscriptionWith(status: SubscriptionStatus): Subscription {
  return Subscription.create({
    businessId,
    planId: ENTERPRISE.id,
    status,
    provider: "mercadopago",
    externalId: "mp-1",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
  });
}

function subscriptionRepoMock(subscription: Subscription | null): ISubscriptionRepository {
  return {
    save: vi.fn(),
    findCurrentByBusinessId: vi.fn().mockResolvedValue(subscription),
    findByExternalId: vi.fn(),
  };
}

function reader(subscription: Subscription | null, planRepo = planRepoMock()): PlanLimitReader {
  return new PlanLimitReader(subscriptionRepoMock(subscription), planRepo, noopLogger);
}

describe("PlanLimitReader", () => {
  it("applies the limits of the subscribed plan when the subscription is active", async () => {
    const limit = await reader(subscriptionWith("active")).getLimit(businessId, "products");
    expect(limit).toBeNull(); // Enterprise: ilimitado
  });

  it("applies the limits of the subscribed plan while trialing", async () => {
    const limit = await reader(subscriptionWith("trialing")).getLimit(businessId, "products");
    expect(limit).toBeNull();
  });

  it("does NOT grant the plan while the checkout is only pending", async () => {
    // Sin esto, iniciar un checkout de Enterprise y abandonarlo daría límites ilimitados.
    const limit = await reader(subscriptionWith("pending")).getLimit(businessId, "products");
    expect(limit).toBe(20); // cae al plan gratis
  });

  it("does NOT grant the plan when the recurring payment failed", async () => {
    const limit = await reader(subscriptionWith("past_due")).getLimit(businessId, "products");
    expect(limit).toBe(20);
  });

  it("falls back to the free plan when the business has no subscription", async () => {
    // Antes devolvía null (ilimitado): cancelar la suscripción daba acceso total.
    const limit = await reader(null).getLimit(businessId, "products");
    expect(limit).toBe(20);
  });

  it("falls back to the free plan when the subscribed plan no longer exists", async () => {
    const planRepo = planRepoMock({ findById: vi.fn().mockResolvedValue(null) });
    const limit = await reader(subscriptionWith("active"), planRepo).getLimit(businessId, "products");
    expect(limit).toBe(20);
  });

  it("resolves each limited resource from the resolved plan", async () => {
    const r = reader(null);
    expect(await r.getLimit(businessId, "services")).toBe(10);
    expect(await r.getLimit(businessId, "conversations")).toBe(200);
  });

  it("does not enforce limits when the plan catalog is not seeded", async () => {
    const planRepo = planRepoMock({ findBySlug: vi.fn().mockResolvedValue(null) });
    const limit = await reader(null, planRepo).getLimit(businessId, "products");
    expect(limit).toBeNull();
  });
});
