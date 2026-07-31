import "dotenv/config";
import { Redis } from "ioredis";
import request from "supertest";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { Pool } from "pg";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { createApp } from "../../../src/app.js";
import type { ILogger } from "@shared/logger/Logger.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";
const TEST_REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379";

const noopLogger: ILogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

/**
 * Prueba lo que un unit test con un fake Redis no puede probar: que dos
 * *procesos* (acá, dos apps de Express independientes) realmente comparten
 * el mismo contador cuando apuntan al mismo Redis — que es justo el problema
 * que el store en memoria no resuelve con más de una instancia detrás del
 * balanceador.
 */
describe("Distributed rate limiting via Redis", () => {
  let redis: Redis;
  let db: PgDbClient;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
    redis = new Redis(TEST_REDIS_URL);
  });

  beforeEach(async () => {
    await redis.flushdb();
  });

  afterAll(async () => {
    await db.close();
    await redis.quit();
  });

  function buildInstance() {
    return createApp(
      db,
      noopLogger,
      { jwtSecret: "test-secret-test-secret", jwtExpiresIn: "2h" },
      undefined, // aiConfig
      undefined, // aiProviderOverride
      undefined, // whatsappConfig
      undefined, // whatsAppClientOverride
      undefined, // corsOrigin
      undefined, // paymentProviderOverride
      undefined, // mercadoPagoConfig
      { api: { windowMs: 60_000, max: 2 }, auth: { windowMs: 60_000, max: 20 }, webhook: { windowMs: 60_000, max: 20 } },
      undefined, // redisClientOverride
      TEST_REDIS_URL,
    );
  }

  it("shares the quota across independent app instances behind the same Redis", async () => {
    const instanceA = buildInstance();
    const instanceB = buildInstance();

    // Cupo de 2: ambas peticiones a la instancia A lo agotan...
    expect((await request(instanceA).get("/plans")).status).toBe(200);
    expect((await request(instanceA).get("/plans")).status).toBe(200);

    // ...así que la instancia B, aunque nunca recibió tráfico, ya no tiene cupo.
    // Con un store en memoria por proceso esta petición devolvería 200.
    const res = await request(instanceB).get("/plans");
    expect(res.status).toBe(429);
  });

  it("keeps separate quotas per limiter even sharing the same store", async () => {
    const instanceA = buildInstance();

    await request(instanceA).get("/plans");
    await request(instanceA).get("/plans");
    expect((await request(instanceA).get("/plans")).status).toBe(429);

    // /webhooks está exento del límite general y tiene su propio cupo (20).
    const webhookRes = await request(instanceA)
      .post("/webhooks/mercadopago")
      .send({ type: "unknown" });
    expect(webhookRes.status).not.toBe(429);
  });
});
