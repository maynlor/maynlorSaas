import "dotenv/config";
import { Pool } from "pg";
import request from "supertest";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
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

describe("Client memory flow", () => {
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
      "TRUNCATE messages, conversations, client_memories, clients, products, services, faqs, subscriptions, businesses RESTART IDENTITY CASCADE",
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

  async function createClient(token: string) {
    const response = await request(app)
      .post("/clients")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Juan Pérez" });
    return response.body.id as string;
  }

  it("adds, lists and deletes memory entries for a client", async () => {
    const token = await registerBusiness();
    const clientId = await createClient(token);

    const addResponse = await request(app)
      .post(`/clients/${clientId}/memories`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Prefiere entrega por la tarde" });

    expect(addResponse.status).toBe(201);
    expect(addResponse.body.content).toBe("Prefiere entrega por la tarde");

    const listResponse = await request(app)
      .get(`/clients/${clientId}/memories`)
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items).toHaveLength(1);

    const memoryId = addResponse.body.id as string;
    const deleteResponse = await request(app)
      .delete(`/clients/${clientId}/memories/${memoryId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteResponse.status).toBe(204);

    const listAfterDelete = await request(app)
      .get(`/clients/${clientId}/memories`)
      .set("Authorization", `Bearer ${token}`);
    expect(listAfterDelete.body.items).toHaveLength(0);
  });

  it("returns 404 when adding memory for a client that doesn't exist", async () => {
    const token = await registerBusiness();

    const response = await request(app)
      .post("/clients/00000000-0000-0000-0000-000000000000/memories")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Algo" });

    expect(response.status).toBe(404);
  });

  it("still allows normal client routes to work alongside the memories sub-route", async () => {
    const token = await registerBusiness();
    const clientId = await createClient(token);

    const getResponse = await request(app)
      .get(`/clients/${clientId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.id).toBe(clientId);
  });
});
