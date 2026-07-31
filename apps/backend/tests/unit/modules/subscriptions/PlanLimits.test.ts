import { describe, it, expect } from "vitest";
import { PlanLimits } from "@modules/subscriptions/domain/value-objects/PlanLimits.js";
import { Plan } from "@modules/subscriptions/domain/Plan.js";

describe("PlanLimits", () => {
  it("treats null as unlimited for each limit", () => {
    const result = PlanLimits.create({
      maxProducts: null,
      maxServices: null,
      maxUsers: null,
      maxConversationsPerMonth: null,
      maxKnowledgeDocuments: null,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.maxProducts).toBeNull();
  });

  it("rejects negative limits", () => {
    const result = PlanLimits.create({
      maxProducts: -1,
      maxServices: null,
      maxUsers: null,
      maxConversationsPerMonth: null,
      maxKnowledgeDocuments: null,
    });

    expect(result.isFailure).toBe(true);
  });
});

describe("Plan.reconstitute", () => {
  it("builds a Plan from persistence data", () => {
    const result = Plan.reconstitute({
      id: "p1",
      name: "Enterprise",
      slug: "enterprise",
      description: "Custom",
      priceMonthly: null,
      currency: "ARS",
      limits: {
        maxProducts: null,
        maxServices: null,
        maxUsers: null,
        maxConversationsPerMonth: null,
        maxKnowledgeDocuments: null,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.priceMonthly).toBeNull();
    expect(result.value.limits.maxProducts).toBeNull();
  });
});
