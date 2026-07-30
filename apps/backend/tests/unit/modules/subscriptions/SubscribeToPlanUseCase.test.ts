import { describe, it, expect, vi } from "vitest";
import { SubscribeToPlanUseCase } from "@modules/subscriptions/application/use-cases/SubscribeToPlanUseCase.js";
import { CancelSubscriptionUseCase } from "@modules/subscriptions/application/use-cases/CancelSubscriptionUseCase.js";
import { Plan } from "@modules/subscriptions/domain/Plan.js";
import { Subscription } from "@modules/subscriptions/domain/Subscription.js";
import type { IPlanRepository } from "@modules/subscriptions/application/repositories/IPlanRepository.js";
import type { ISubscriptionRepository } from "@modules/subscriptions/application/repositories/ISubscriptionRepository.js";
import type { PaymentProvider } from "@modules/subscriptions/application/providers/PaymentProvider.js";
import { NotFoundError } from "@shared/errors/AppError.js";
import { PlanNotActiveError } from "@modules/subscriptions/domain/errors/SubscriptionDomainErrors.js";

const businessId = "b1";

function buildPlan(overrides: { isActive?: boolean } = {}): Plan {
  return Plan.reconstitute({
    id: "plan-1",
    name: "Pro",
    slug: "pro",
    description: null,
    priceMonthly: 15000,
    currency: "ARS",
    limits: { maxProducts: 200, maxServices: 100, maxUsers: 5, maxConversationsPerMonth: 2000 },
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).value;
}

function planRepoMock(overrides: Partial<IPlanRepository> = {}): IPlanRepository {
  return {
    findAllActive: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(buildPlan()),
    findBySlug: vi.fn().mockResolvedValue(buildPlan()),
    ...overrides,
  };
}

function subscriptionRepoMock(overrides: Partial<ISubscriptionRepository> = {}): ISubscriptionRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findCurrentByBusinessId: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function paymentProviderMock(overrides: Partial<PaymentProvider> = {}): PaymentProvider {
  const start = new Date("2026-01-01T00:00:00Z");
  const end = new Date("2026-01-31T00:00:00Z");
  return {
    activateSubscription: vi
      .fn()
      .mockResolvedValue({ status: "active", currentPeriodStart: start, currentPeriodEnd: end }),
    ...overrides,
  };
}

describe("SubscribeToPlanUseCase", () => {
  it("creates a new subscription for the given plan", async () => {
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock();
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "pro" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.plan.slug).toBe("pro");
    expect(result.value.status).toBe("active");
    expect(subscriptionRepo.save).toHaveBeenCalledOnce();
  });

  it("fails with NotFoundError for an unknown plan slug", async () => {
    const planRepo = planRepoMock({ findBySlug: vi.fn().mockResolvedValue(null) });
    const subscriptionRepo = subscriptionRepoMock();
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "missing" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
  });

  it("fails with PlanNotActiveError when the plan is disabled", async () => {
    const planRepo = planRepoMock({ findBySlug: vi.fn().mockResolvedValue(buildPlan({ isActive: false })) });
    const subscriptionRepo = subscriptionRepoMock();
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "pro" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(PlanNotActiveError);
  });

  it("cancels the current subscription before creating a new one when switching plans", async () => {
    const currentSubscription = Subscription.create({
      businessId,
      planId: "plan-old",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    });
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock({
      findCurrentByBusinessId: vi.fn().mockResolvedValue(currentSubscription),
    });
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, paymentProvider);

    await useCase.execute(businessId, { planSlug: "pro" });

    expect(currentSubscription.status).toBe("canceled");
    expect(subscriptionRepo.save).toHaveBeenCalledTimes(2);
  });
});

describe("CancelSubscriptionUseCase", () => {
  it("cancels the current subscription", async () => {
    const subscription = Subscription.create({
      businessId,
      planId: "plan-1",
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    });
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock({
      findCurrentByBusinessId: vi.fn().mockResolvedValue(subscription),
    });
    const useCase = new CancelSubscriptionUseCase(subscriptionRepo, planRepo);

    const result = await useCase.execute(businessId);

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe("canceled");
    expect(subscriptionRepo.save).toHaveBeenCalledOnce();
  });

  it("fails with NotFoundError when there is no current subscription", async () => {
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock();
    const useCase = new CancelSubscriptionUseCase(subscriptionRepo, planRepo);

    const result = await useCase.execute(businessId);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
