import { describe, it, expect } from "vitest";
import { Subscription, PAST_DUE_GRACE_DAYS } from "@modules/subscriptions/domain/Subscription.js";

const businessId = "b1";

function daysFrom(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function activeSubscription(): Subscription {
  return Subscription.create({
    businessId,
    planId: "plan-pro",
    status: "active",
    provider: "mercadopago",
    externalId: "mp-1",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
  });
}

function goPastDue(subscription: Subscription, at: Date): void {
  subscription.applyProviderUpdate({
    status: "past_due",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    now: at,
  });
}

describe("Subscription grace period", () => {
  it("grants access right after a failed charge", () => {
    const failedAt = new Date("2026-03-01T00:00:00Z");
    const subscription = activeSubscription();
    goPastDue(subscription, failedAt);

    expect(subscription.grantsPlanAccessAt(daysFrom(failedAt, 1))).toBe(true);
  });

  it("keeps access until the last day of the grace window", () => {
    const failedAt = new Date("2026-03-01T00:00:00Z");
    const subscription = activeSubscription();
    goPastDue(subscription, failedAt);

    expect(subscription.grantsPlanAccessAt(daysFrom(failedAt, PAST_DUE_GRACE_DAYS - 1))).toBe(true);
  });

  it("revokes access once the grace window elapsed", () => {
    const failedAt = new Date("2026-03-01T00:00:00Z");
    const subscription = activeSubscription();
    goPastDue(subscription, failedAt);

    expect(subscription.grantsPlanAccessAt(daysFrom(failedAt, PAST_DUE_GRACE_DAYS + 1))).toBe(false);
  });

  it("does not extend the grace window on repeated past_due webhooks", () => {
    // Mercado Pago reintenta el cobro y reenvía notificaciones: si cada una
    // reiniciara la gracia, nunca se degradaría al plan gratis.
    const failedAt = new Date("2026-03-01T00:00:00Z");
    const subscription = activeSubscription();
    goPastDue(subscription, failedAt);
    const originalDeadline = subscription.graceEndsAt;

    goPastDue(subscription, daysFrom(failedAt, 5));

    expect(subscription.graceEndsAt).toEqual(originalDeadline);
    expect(subscription.grantsPlanAccessAt(daysFrom(failedAt, PAST_DUE_GRACE_DAYS + 1))).toBe(false);
  });

  it("clears the grace deadline when the payment recovers", () => {
    const failedAt = new Date("2026-03-01T00:00:00Z");
    const subscription = activeSubscription();
    goPastDue(subscription, failedAt);

    subscription.applyProviderUpdate({
      status: "active",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      now: daysFrom(failedAt, 2),
    });

    expect(subscription.graceEndsAt).toBeNull();
    expect(subscription.grantsPlanAccessAt(daysFrom(failedAt, 60))).toBe(true);
  });

  it("never grants access while only pending, regardless of dates", () => {
    const subscription = Subscription.create({
      businessId,
      planId: "plan-enterprise",
      status: "pending",
      provider: "mercadopago",
      externalId: "mp-2",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    });

    expect(subscription.graceEndsAt).toBeNull();
    expect(subscription.grantsPlanAccessAt(new Date())).toBe(false);
  });
});
