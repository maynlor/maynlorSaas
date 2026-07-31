import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import {
  createApiRateLimiter,
  createAuthRateLimiter,
  createWebhookRateLimiter,
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
});
