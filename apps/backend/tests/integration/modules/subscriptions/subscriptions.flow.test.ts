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
      "TRUNCATE messages, conversations, clients, products, services, faqs, subscriptions, businesses RESTART IDENTITY CASCADE",
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

  it("returns 404 when there is no current subscription", async () => {
    const token = await registerBusiness();

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
});
