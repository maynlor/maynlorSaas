import { describe, it, expect, vi } from "vitest";
import { SubscribeToPlanUseCase } from "@modules/subscriptions/application/use-cases/SubscribeToPlanUseCase.js";
import { CancelSubscriptionUseCase } from "@modules/subscriptions/application/use-cases/CancelSubscriptionUseCase.js";
import { Plan } from "@modules/subscriptions/domain/Plan.js";
import { Subscription } from "@modules/subscriptions/domain/Subscription.js";
import { Business } from "@modules/businesses/domain/Business.js";
import type { IPlanRepository } from "@modules/subscriptions/application/repositories/IPlanRepository.js";
import type { ISubscriptionRepository } from "@modules/subscriptions/application/repositories/ISubscriptionRepository.js";
import type { IBusinessRepository } from "@modules/businesses/application/repositories/IBusinessRepository.js";
import type { PaymentProvider } from "@modules/subscriptions/application/providers/PaymentProvider.js";
import { NotFoundError, PaymentProviderError } from "@shared/errors/AppError.js";
import { PlanNotActiveError } from "@modules/subscriptions/domain/errors/SubscriptionDomainErrors.js";
import type { ProductTracker } from "@shared/telemetry/ProductTracker.js";

const businessId = "b1";

function buildPlan(overrides: { isActive?: boolean } = {}): Plan {
  return Plan.reconstitute({
    id: "plan-1",
    name: "Pro",
    slug: "pro",
    description: null,
    priceMonthly: 15000,
    currency: "ARS",
    limits: { maxProducts: 200, maxServices: 100, maxUsers: 5, maxConversationsPerMonth: 2000, maxKnowledgeDocuments: 50 },
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).value;
}

function buildBusiness(): Business {
  return Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
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
    findByExternalId: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function businessRepoMock(overrides: Partial<IBusinessRepository> = {}): IBusinessRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(buildBusiness()),
    findBySlug: vi.fn(),
    findByWhatsAppPhoneNumberId: vi.fn(),
    findAll: vi.fn(),
    existsByEmailOrSlug: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function paymentProviderMock(overrides: Partial<PaymentProvider> = {}): PaymentProvider {
  const start = new Date("2026-01-01T00:00:00Z");
  const end = new Date("2026-01-31T00:00:00Z");
  return {
    createCheckout: vi.fn().mockResolvedValue({
      status: "active",
      provider: "manual",
      externalId: null,
      checkoutUrl: null,
      currentPeriodStart: start,
      currentPeriodEnd: end,
    }),
    cancelSubscription: vi.fn().mockResolvedValue(undefined),
    parseWebhookEvent: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("SubscribeToPlanUseCase", () => {
  it("creates a new subscription for the given plan", async () => {
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock();
    const businessRepo = businessRepoMock();
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, businessRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "pro" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.plan.slug).toBe("pro");
    expect(result.value.status).toBe("active");
    expect(subscriptionRepo.save).toHaveBeenCalledOnce();
  });

  it("tracks subscription_changed on the product tracker", async () => {
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock();
    const businessRepo = businessRepoMock();
    const paymentProvider = paymentProviderMock();
    const tracker: ProductTracker = { track: vi.fn(), identify: vi.fn() };
    const useCase = new SubscribeToPlanUseCase(
      planRepo,
      subscriptionRepo,
      businessRepo,
      paymentProvider,
      tracker,
    );

    await useCase.execute(businessId, { planSlug: "pro" });

    expect(tracker.track).toHaveBeenCalledWith(
      businessId,
      "subscription_changed",
      expect.objectContaining({ planSlug: "pro" }),
    );
  });

  it("returns the checkout URL when the provider requires authorization", async () => {
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock();
    const businessRepo = businessRepoMock();
    const paymentProvider = paymentProviderMock({
      createCheckout: vi.fn().mockResolvedValue({
        status: "pending",
        provider: "mercadopago",
        externalId: "mp-123",
        checkoutUrl: "https://mercadopago.com/checkout/mp-123",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      }),
    });
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, businessRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "pro" });

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe("pending");
    expect(result.value.checkoutUrl).toBe("https://mercadopago.com/checkout/mp-123");
  });

  it("fails with NotFoundError for an unknown plan slug", async () => {
    const planRepo = planRepoMock({ findBySlug: vi.fn().mockResolvedValue(null) });
    const subscriptionRepo = subscriptionRepoMock();
    const businessRepo = businessRepoMock();
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, businessRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "missing" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
  });

  it("fails with PlanNotActiveError when the plan is disabled", async () => {
    const planRepo = planRepoMock({ findBySlug: vi.fn().mockResolvedValue(buildPlan({ isActive: false })) });
    const subscriptionRepo = subscriptionRepoMock();
    const businessRepo = businessRepoMock();
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, businessRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "pro" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(PlanNotActiveError);
  });

  it("fails with NotFoundError when the business no longer exists", async () => {
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock();
    const businessRepo = businessRepoMock({ findById: vi.fn().mockResolvedValue(null) });
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, businessRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "pro" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it("keeps the current subscription intact when the payment provider fails", async () => {
    const currentSubscription = Subscription.create({
      businessId,
      planId: "plan-old",
      status: "active",
      provider: "manual",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    });
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock({
      findCurrentByBusinessId: vi.fn().mockResolvedValue(currentSubscription),
    });
    const businessRepo = businessRepoMock();
    const paymentProvider = paymentProviderMock({
      createCheckout: vi.fn().mockRejectedValue(new Error("Mercado Pago is down")),
    });
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, businessRepo, paymentProvider);

    const result = await useCase.execute(businessId, { planSlug: "pro" });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(PaymentProviderError);
    expect(currentSubscription.status).toBe("active");
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
  });

  it("cancels the current subscription before creating a new one when switching plans", async () => {
    const currentSubscription = Subscription.create({
      businessId,
      planId: "plan-old",
      status: "active",
      provider: "manual",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    });
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock({
      findCurrentByBusinessId: vi.fn().mockResolvedValue(currentSubscription),
    });
    const businessRepo = businessRepoMock();
    const paymentProvider = paymentProviderMock();
    const useCase = new SubscribeToPlanUseCase(planRepo, subscriptionRepo, businessRepo, paymentProvider);

    await useCase.execute(businessId, { planSlug: "pro" });

    expect(currentSubscription.status).toBe("canceled");
    expect(subscriptionRepo.save).toHaveBeenCalledTimes(2);
  });
});

describe("CancelSubscriptionUseCase", () => {
  it("cancels the current subscription and the remote checkout", async () => {
    const subscription = Subscription.create({
      businessId,
      planId: "plan-1",
      status: "active",
      provider: "mercadopago",
      externalId: "mp-123",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    });
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock({
      findCurrentByBusinessId: vi.fn().mockResolvedValue(subscription),
    });
    const paymentProvider = paymentProviderMock();
    const useCase = new CancelSubscriptionUseCase(subscriptionRepo, planRepo, paymentProvider);

    const result = await useCase.execute(businessId);

    expect(result.isSuccess).toBe(true);
    expect(result.value.status).toBe("canceled");
    expect(subscriptionRepo.save).toHaveBeenCalledOnce();
    expect(paymentProvider.cancelSubscription).toHaveBeenCalledWith("mercadopago", "mp-123");
  });

  it("fails with NotFoundError when there is no current subscription", async () => {
    const planRepo = planRepoMock();
    const subscriptionRepo = subscriptionRepoMock();
    const paymentProvider = paymentProviderMock();
    const useCase = new CancelSubscriptionUseCase(subscriptionRepo, planRepo, paymentProvider);

    const result = await useCase.execute(businessId);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
