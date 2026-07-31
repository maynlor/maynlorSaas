import "dotenv/config";
import { Pool } from "pg";
import request from "supertest";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { createApp } from "../../../../src/app.js";
import type { ILogger } from "@shared/logger/Logger.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

const noopLogger: ILogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

describe("Analytics flow", () => {
  let db: PgDbClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
    app = createApp(db, noopLogger, { jwtSecret: "test-secret-test-secret", jwtExpiresIn: "2h" });
  });

  beforeEach(async () => {
    await db.query(
      "TRUNCATE messages, conversations, clients, subscriptions, businesses RESTART IDENTITY CASCADE",
    );
  });

  afterAll(async () => {
    await db.close();
  });

  async function registerBusiness(): Promise<string> {
    const response = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme", email: "acme@test.com", slug: "acme" },
        user: { email: "owner@acme.com", password: "password123" },
      });
    return response.body.token as string;
  }

  it("returns a full summary for a freshly registered (empty) business", async () => {
    const token = await registerBusiness();

    const response = await request(app)
      .get("/analytics/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.totals).toEqual({
      conversations: 0,
      messages: 0,
      clients: 0,
      products: 0,
      services: 0,
      faqs: 0,
      knowledgeDocuments: 0,
    });
    expect(response.body.conversationsPerDay).toHaveLength(30);
    expect(response.body.messagesPerDay).toHaveLength(30);
    // auto-suscripto al plan starter al registrarse.
    expect(response.body.planUsage).toEqual(
      expect.arrayContaining([{ resource: "products", used: 0, limit: 20 }]),
    );
  });

  it("rejects requests without a valid token", async () => {
    const response = await request(app).get("/analytics/summary");
    expect(response.status).toBe(401);
  });

  it("never mixes data across businesses", async () => {
    const tokenA = await registerBusiness();
    const responseB = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Otra", email: "otra@test.com", slug: "otra" },
        user: { email: "owner@otra.com", password: "password123" },
      });
    const tokenB = responseB.body.token as string;

    await db.query(
      `INSERT INTO clients (business_id, name)
       SELECT id, 'Cliente de A' FROM businesses WHERE slug = 'acme'`,
    );

    const summaryA = await request(app).get("/analytics/summary").set("Authorization", `Bearer ${tokenA}`);
    const summaryB = await request(app).get("/analytics/summary").set("Authorization", `Bearer ${tokenB}`);

    expect(summaryA.body.totals.clients).toBe(1);
    expect(summaryB.body.totals.clients).toBe(0);
  });
});
