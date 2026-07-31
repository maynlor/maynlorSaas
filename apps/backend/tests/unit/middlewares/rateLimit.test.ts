import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { Redis } from "ioredis";
import {
  createApiRateLimiter,
  createAuthRateLimiter,
  createWebhookRateLimiter,
  createRateLimitStore,
} from "../../../src/presentation/middlewares/rateLimit.js";

function appWith(middleware: express.RequestHandler): express.Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(middleware);
  app.get("/anything", (_req, res) => res.status(200).json({ ok: true }));
  app.post("/webhooks/mercadopago", (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

async function hit(app: express.Express, path = "/anything"): Promise<number> {
  const res = await request(app).get(path);
  return res.status;
}

describe("rate limiting", () => {
  it("allows requests under the limit", async () => {
    const app = appWith(createApiRateLimiter({ windowMs: 60_000, max: 3 }));

    expect(await hit(app)).toBe(200);
    expect(await hit(app)).toBe(200);
    expect(await hit(app)).toBe(200);
  });

  it("rejects with 429 once the limit is exceeded", async () => {
    const app = appWith(createApiRateLimiter({ windowMs: 60_000, max: 2 }));

    await hit(app);
    await hit(app);

    const res = await request(app).get("/anything");
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("does not apply the general limit to webhooks", async () => {
    // Las notificaciones del proveedor llegan desde pocas IPs y en ráfagas:
    // si compartieran el cupo general se perderían confirmaciones de pago.
    const app = appWith(createApiRateLimiter({ windowMs: 60_000, max: 1 }));

    await request(app).post("/webhooks/mercadopago");
    const res = await request(app).post("/webhooks/mercadopago");

    expect(res.status).toBe(200);
  });

  it("applies a stricter, separate budget to auth endpoints", async () => {
    const app = appWith(createAuthRateLimiter({ windowMs: 60_000, max: 1 }));

    expect(await hit(app)).toBe(200);
    expect(await hit(app)).toBe(429);
  });

  it("limits webhooks as a flood safeguard", async () => {
    const app = appWith(createWebhookRateLimiter({ windowMs: 60_000, max: 1 }));

    expect(await hit(app)).toBe(200);
    expect(await hit(app)).toBe(429);
  });

  it("does not apply the general limit to health checks", async () => {
    // Si el health check consumiera cupo, la plataforma de hosting podría
    // recibir un 429 y dar la instancia por caída.
    const app = express();
    app.set("trust proxy", 1);
    app.use(createApiRateLimiter({ windowMs: 60_000, max: 1 }));
    app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

    await request(app).get("/health");
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
  });
});

describe("createRateLimitStore", () => {
  it("returns undefined without a Redis client, falling back to per-process memory", () => {
    expect(createRateLimitStore(undefined, "api")).toBeUndefined();
  });

  it("wraps a Redis client's raw command interface into an express-rate-limit Store", () => {
    const fakeClient = { call: vi.fn().mockResolvedValue(1) } as unknown as Redis;

    const store = createRateLimitStore(fakeClient, "api");

    expect(store).toBeDefined();
    expect(typeof store?.increment).toBe("function");
  });

  it("builds three independently-usable limiters over the same Redis client", () => {
    // express-rate-limit prohíbe compartir una misma instancia de Store entre
    // limitadores; esto reprodujo un crash real al arrancar con Redis
    // configurado (los tests con store en memoria no lo detectaban).
    const fakeClient = { call: vi.fn().mockResolvedValue(1) } as unknown as Redis;
    const config = { windowMs: 60_000, max: 10 };

    expect(() => {
      createApiRateLimiter(config, createRateLimitStore(fakeClient, "api"));
      createAuthRateLimiter(config, createRateLimitStore(fakeClient, "auth"));
      createWebhookRateLimiter(config, createRateLimitStore(fakeClient, "webhook"));
    }).not.toThrow();
  });
});
