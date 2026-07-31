import { createHmac } from "node:crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MercadoPagoPaymentProvider } from "@modules/subscriptions/infrastructure/providers/MercadoPagoPaymentProvider.js";
import { Plan } from "@modules/subscriptions/domain/Plan.js";

const accessToken = "test-access-token";
const webhookSecret = "test-webhook-secret";
const backUrl = "https://app.test/billing";

function buildPaidPlan(): Plan {
  return Plan.reconstitute({
    id: "plan-1",
    name: "Pro",
    slug: "pro",
    description: null,
    priceMonthly: 15000,
    currency: "ARS",
    limits: { maxProducts: 200, maxServices: 100, maxUsers: 5, maxConversationsPerMonth: 2000, maxKnowledgeDocuments: 50 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).value;
}

function buildFreePlan(): Plan {
  return Plan.reconstitute({
    id: "plan-starter",
    name: "Starter",
    slug: "starter",
    description: null,
    priceMonthly: 0,
    currency: "ARS",
    limits: { maxProducts: 20, maxServices: 10, maxUsers: 1, maxConversationsPerMonth: 200, maxKnowledgeDocuments: 5 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).value;
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("MercadoPagoPaymentProvider", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("activates free plans without calling Mercado Pago", async () => {
    const provider = new MercadoPagoPaymentProvider(accessToken, webhookSecret, backUrl);

    const result = await provider.createCheckout({
      businessId: "b1",
      plan: buildFreePlan(),
      payerEmail: "owner@acme.com",
    });

    expect(result).toMatchObject({ status: "active", provider: "manual", checkoutUrl: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a preapproval checkout for paid plans", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "mp-preapproval-1",
        status: "pending",
        init_point: "https://mercadopago.com/checkout/mp-preapproval-1",
        date_created: "2026-01-01T00:00:00Z",
      }),
    );
    const provider = new MercadoPagoPaymentProvider(accessToken, webhookSecret, backUrl);

    const result = await provider.createCheckout({
      businessId: "b1",
      plan: buildPaidPlan(),
      payerEmail: "owner@acme.com",
    });

    expect(result.status).toBe("pending");
    expect(result.provider).toBe("mercadopago");
    expect(result.externalId).toBe("mp-preapproval-1");
    expect(result.checkoutUrl).toBe("https://mercadopago.com/checkout/mp-preapproval-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/preapproval",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("cancels a remote preapproval", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    const provider = new MercadoPagoPaymentProvider(accessToken, webhookSecret, backUrl);

    await provider.cancelSubscription("mercadopago", "mp-preapproval-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mercadopago.com/preapproval/mp-preapproval-1",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("ignores webhook payloads that are not preapproval events", async () => {
    const provider = new MercadoPagoPaymentProvider(accessToken, webhookSecret, backUrl);
    const body = Buffer.from(JSON.stringify({ type: "payment", data: { id: "123" } }));

    const event = await provider.parseWebhookEvent(body, {});

    expect(event).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a webhook with an invalid signature", async () => {
    const provider = new MercadoPagoPaymentProvider(accessToken, webhookSecret, backUrl);
    const body = Buffer.from(JSON.stringify({ type: "preapproval", data: { id: "mp-preapproval-1" } }));

    await expect(
      provider.parseWebhookEvent(body, { "x-signature": "ts=123,v1=deadbeef", "x-request-id": "req-1" }),
    ).rejects.toThrow(/signature/i);
  });

  it("accepts a webhook with a valid signature and maps the resulting status", async () => {
    const provider = new MercadoPagoPaymentProvider(accessToken, webhookSecret, backUrl);
    const body = Buffer.from(JSON.stringify({ type: "preapproval", data: { id: "mp-preapproval-1" } }));
    const ts = "1700000000";
    const manifest = `id:mp-preapproval-1;request-id:req-1;ts:${ts};`;
    const hash = createHmac("sha256", webhookSecret).update(manifest).digest("hex");

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: "mp-preapproval-1",
        status: "authorized",
        date_created: "2026-01-01T00:00:00Z",
      }),
    );

    const event = await provider.parseWebhookEvent(body, {
      "x-signature": `ts=${ts},v1=${hash}`,
      "x-request-id": "req-1",
    });

    expect(event).not.toBeNull();
    expect(event?.externalId).toBe("mp-preapproval-1");
    expect(event?.status).toBe("active");
  });
});
