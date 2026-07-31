import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { createApp } from "../../../../src/app.js";
import type { ILogger } from "@shared/logger/Logger.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

const noopLogger: ILogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

describe("Subscriptions flow", () => {
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
      "TRUNCATE messages, conversations, clients, products, services, faqs, subscription_payments, subscriptions, businesses RESTART IDENTITY CASCADE",
    );
  });

  afterAll(async () => {
    await db.close();
  });

  async function registerBusiness() {
    const response = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme", email: "acme@test.com", slug: "acme" },
        user: { email: "owner@acme.com", password: "password123" },
      });
    return response.body.token as string;
  }

  it("lists the seeded plan catalog", async () => {
    const response = await request(app).get("/plans");

    expect(response.status).toBe(200);
    const slugs = response.body.items.map((p: { slug: string }) => p.slug);
    expect(slugs).toEqual(expect.arrayContaining(["starter", "pro", "business", "enterprise"]));
  });

  it("subscribes a business to a plan and returns it as the current subscription", async () => {
    const token = await registerBusiness();

    const subscribeResponse = await request(app)
      .post("/subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planSlug: "pro" });

    expect(subscribeResponse.status).toBe(201);
    expect(subscribeResponse.body.status).toBe("active");
    expect(subscribeResponse.body.plan.slug).toBe("pro");

    const meResponse = await request(app)
      .get("/subscriptions/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.plan.slug).toBe("pro");
  });

  it("auto-subscribes a newly registered business to the starter plan", async () => {
    const token = await registerBusiness();

    const response = await request(app)
      .get("/subscriptions/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.plan.slug).toBe("starter");
    expect(response.body.status).toBe("active");
  });

  it("returns 404 when the current subscription was canceled", async () => {
    const token = await registerBusiness();

    await request(app).delete("/subscriptions/me").set("Authorization", `Bearer ${token}`);

    const response = await request(app)
      .get("/subscriptions/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it("switching plans cancels the previous subscription", async () => {
    const token = await registerBusiness();

    await request(app)
      .post("/subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planSlug: "starter" });

    const switchResponse = await request(app)
      .post("/subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planSlug: "business" });

    expect(switchResponse.status).toBe(201);
    expect(switchResponse.body.plan.slug).toBe("business");

    const meResponse = await request(app)
      .get("/subscriptions/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meResponse.body.plan.slug).toBe("business");
  });

  it("cancels the current subscription", async () => {
    const token = await registerBusiness();
    await request(app)
      .post("/subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planSlug: "starter" });

    const cancelResponse = await request(app)
      .delete("/subscriptions/me")
      .set("Authorization", `Bearer ${token}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.status).toBe("canceled");

    const meResponse = await request(app)
      .get("/subscriptions/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meResponse.status).toBe(404);
  });

  it("rejects an unknown plan slug", async () => {
    const token = await registerBusiness();

    const response = await request(app)
      .post("/subscriptions")
      .set("Authorization", `Bearer ${token}`)
      .send({ planSlug: "does-not-exist" });

    expect(response.status).toBe(404);
  });

  it("returns an empty billing history for a business with no charges", async () => {
    const token = await registerBusiness();

    const response = await request(app)
      .get("/subscriptions/me/payments")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it("returns the recorded charges, newest first, scoped to the business", async () => {
    const token = await registerBusiness();
    const { rows } = await db.query<{ id: string; business_id: string }>(
      "SELECT id, business_id FROM subscriptions LIMIT 1",
    );
    const subscription = rows[0]!;

    await db.query(
      `INSERT INTO subscription_payments (subscription_id, business_id, provider, external_id, status, amount, currency, processed_at)
       VALUES ($1,$2,'mercadopago','pay-old','approved',15000,'ARS','2026-01-01T00:00:00Z'),
              ($1,$2,'mercadopago','pay-new','rejected',15000,'ARS','2026-02-01T00:00:00Z')`,
      [subscription.id, subscription.business_id],
    );

    const response = await request(app)
      .get("/subscriptions/me/payments")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].status).toBe("rejected");
    expect(response.body.items[0].amount).toBe(15000);
    expect(response.body.items[1].status).toBe("approved");
  });

  it("does not record the same provider charge twice when a webhook is retried", async () => {
    const token = await registerBusiness();
    const { rows } = await db.query<{ id: string; business_id: string }>(
      "SELECT id, business_id FROM subscriptions LIMIT 1",
    );
    const subscription = rows[0]!;

    const insert = `INSERT INTO subscription_payments (subscription_id, business_id, provider, external_id, status, amount, currency, processed_at)
       VALUES ($1,$2,'mercadopago','pay-dup','pending',15000,'ARS','2026-01-01T00:00:00Z')
       ON CONFLICT (provider, external_id) DO UPDATE SET status = EXCLUDED.status`;
    await db.query(insert, [subscription.id, subscription.business_id]);
    await db.query(insert.replace("'pending'", "'approved'"), [subscription.id, subscription.business_id]);

    const response = await request(app)
      .get("/subscriptions/me/payments")
      .set("Authorization", `Bearer ${token}`);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].status).toBe("approved");
  });
});
