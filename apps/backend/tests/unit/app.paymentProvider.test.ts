import { describe, it, expect, vi } from "vitest";
import { createApp } from "../../src/app.js";
import type { IDbClient } from "@shared/database/DbClient.js";
import type { ILogger } from "@shared/logger/Logger.js";

const db = { query: vi.fn(), transaction: vi.fn(), close: vi.fn() } as unknown as IDbClient;
const logger: ILogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const authConfig = { jwtSecret: "test-secret-test-secret", jwtExpiresIn: "2h" };

function buildApp(mercadoPago: { accessToken?: string; webhookSecret?: string }) {
  return createApp(
    db,
    logger,
    authConfig,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      accessToken: mercadoPago.accessToken,
      webhookSecret: mercadoPago.webhookSecret,
      backUrl: "https://app.test/billing",
    },
  );
}

describe("payment provider wiring", () => {
  it("refuses to start with a Mercado Pago token but no webhook secret", () => {
    // Arrancar así dejaría el webhook sin autenticar: cualquiera podría
    // activarse una suscripción con un POST.
    expect(() => buildApp({ accessToken: "APP_USR-token" })).toThrow(/MERCADOPAGO_WEBHOOK_SECRET is required/);
  });

  it("starts with both Mercado Pago credentials", () => {
    expect(() => buildApp({ accessToken: "APP_USR-token", webhookSecret: "s3cr3t" })).not.toThrow();
  });

  it("starts without Mercado Pago configured, falling back to the manual provider", () => {
    expect(() => buildApp({})).not.toThrow();
  });
});
