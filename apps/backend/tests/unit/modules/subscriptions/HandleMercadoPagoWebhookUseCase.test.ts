import { describe, it, expect, vi } from "vitest";
import { HandleMercadoPagoWebhookUseCase } from "@modules/subscriptions/application/use-cases/HandleMercadoPagoWebhookUseCase.js";
import { Subscription } from "@modules/subscriptions/domain/Subscription.js";
import type { ISubscriptionRepository } from "@modules/subscriptions/application/repositories/ISubscriptionRepository.js";
import type { ISubscriptionPaymentRepository } from "@modules/subscriptions/application/repositories/ISubscriptionPaymentRepository.js";
import type {
  PaymentProvider,
  ProviderWebhookEvent,
} from "@modules/subscriptions/application/providers/PaymentProvider.js";
import type { ILogger } from "@shared/logger/Logger.js";
import { UnauthorizedError } from "@shared/errors/AppError.js";

const logger: ILogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const rawBody = Buffer.from("{}");
const headers = {};

function existingSubscription(): Subscription {
  return Subscription.create({
    businessId: "b1",
    planId: "plan-pro",
    status: "pending",
    provider: "mercadopago",
    externalId: "mp-sub-1",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
  });
}

function build(event: ProviderWebhookEvent | null, subscription: Subscription | null) {
  const provider = {
    createCheckout: vi.fn(),
    cancelSubscription: vi.fn(),
    parseWebhookEvent: vi.fn().mockResolvedValue(event),
  } as unknown as PaymentProvider;
  const subscriptionRepo: ISubscriptionRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findCurrentByBusinessId: vi.fn(),
    findByExternalId: vi.fn().mockResolvedValue(subscription),
  };
  const paymentRepo: ISubscriptionPaymentRepository = {
    save: vi.fn().mockResolvedValue(undefined),
    findByBusinessId: vi.fn().mockResolvedValue([]),
  };
  const useCase = new HandleMercadoPagoWebhookUseCase(provider, subscriptionRepo, paymentRepo, logger);
  return { useCase, provider, subscriptionRepo, paymentRepo };
}

describe("HandleMercadoPagoWebhookUseCase", () => {
  it("activates the subscription on an authorized subscription event", async () => {
    const subscription = existingSubscription();
    const { useCase, subscriptionRepo } = build(
      {
        kind: "subscription",
        externalId: "mp-sub-1",
        status: "active",
        currentPeriodStart: new Date("2026-03-01"),
        currentPeriodEnd: new Date("2026-03-31"),
      },
      subscription,
    );

    const result = await useCase.execute(rawBody, headers);

    expect(result.isSuccess).toBe(true);
    expect(subscription.status).toBe("active");
    expect(subscriptionRepo.save).toHaveBeenCalledOnce();
  });

  it("records a recurring charge as a subscription payment", async () => {
    const subscription = existingSubscription();
    const { useCase, paymentRepo } = build(
      {
        kind: "payment",
        subscriptionExternalId: "mp-sub-1",
        externalId: "mp-pay-99",
        status: "approved",
        amount: 15000,
        currency: "ARS",
        processedAt: new Date("2026-04-01"),
      },
      subscription,
    );

    const result = await useCase.execute(rawBody, headers);

    expect(result.isSuccess).toBe(true);
    expect(paymentRepo.save).toHaveBeenCalledOnce();
    const saved = vi.mocked(paymentRepo.save).mock.calls[0]![0];
    expect(saved.externalId).toBe("mp-pay-99");
    expect(saved.status).toBe("approved");
    expect(saved.amount).toBe(15000);
    expect(saved.businessId).toBe("b1");
    expect(saved.subscriptionId).toBe(subscription.id);
  });

  it("records rejected charges too, so failed billing is auditable", async () => {
    const { useCase, paymentRepo } = build(
      {
        kind: "payment",
        subscriptionExternalId: "mp-sub-1",
        externalId: "mp-pay-100",
        status: "rejected",
        amount: 15000,
        currency: "ARS",
        processedAt: new Date("2026-05-01"),
      },
      existingSubscription(),
    );

    await useCase.execute(rawBody, headers);

    expect(vi.mocked(paymentRepo.save).mock.calls[0]![0].status).toBe("rejected");
  });

  it("ignores payments for a subscription we do not know", async () => {
    const { useCase, paymentRepo } = build(
      {
        kind: "payment",
        subscriptionExternalId: "mp-unknown",
        externalId: "mp-pay-1",
        status: "approved",
        amount: 100,
        currency: "ARS",
        processedAt: new Date(),
      },
      null,
    );

    const result = await useCase.execute(rawBody, headers);

    expect(result.isSuccess).toBe(true);
    expect(paymentRepo.save).not.toHaveBeenCalled();
  });

  it("ignores notifications the provider does not recognise", async () => {
    const { useCase, subscriptionRepo, paymentRepo } = build(null, existingSubscription());

    const result = await useCase.execute(rawBody, headers);

    expect(result.isSuccess).toBe(true);
    expect(subscriptionRepo.save).not.toHaveBeenCalled();
    expect(paymentRepo.save).not.toHaveBeenCalled();
  });

  it("rejects the request when the signature is invalid", async () => {
    const { useCase, provider } = build(null, existingSubscription());
    vi.mocked(provider.parseWebhookEvent).mockRejectedValue(new Error("Invalid signature"));

    const result = await useCase.execute(rawBody, headers);

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(UnauthorizedError);
  });
});
