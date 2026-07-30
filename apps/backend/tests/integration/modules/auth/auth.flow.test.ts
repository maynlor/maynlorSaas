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

const registerPayload = {
  business: { name: "Acme", email: "biz@acme.com", slug: "acme" },
  user: { email: "owner@acme.com", password: "supersecret" },
};

describe("auth flow (register -> login -> me)", () => {
  let db: PgDbClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
    app = createApp(db, noopLogger, {
      jwtSecret: "test-only-secret-at-least-16-chars",
      jwtExpiresIn: "1h",
    });
  });

  beforeEach(async () => {
    await db.query("TRUNCATE users, businesses RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await db.close();
  });

  it("registers, logs in, and fetches the current user", async () => {
    const registerRes = await request(app).post("/auth/register").send(registerPayload);
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeTypeOf("string");
    expect(registerRes.body.business.slug).toBe("acme");
    expect(registerRes.body.user.email).toBe("owner@acme.com");

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email: "owner@acme.com", password: "supersecret" });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTypeOf("string");

    const meRes = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe("owner@acme.com");
    expect(meRes.body.passwordHash).toBeUndefined();
  });

  it("rejects duplicate registration with 409", async () => {
    await request(app).post("/auth/register").send(registerPayload);
    const res = await request(app).post("/auth/register").send(registerPayload);
    expect(res.status).toBe(409);
  });

  it("rejects login with wrong password with 401", async () => {
    await request(app).post("/auth/register").send(registerPayload);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "owner@acme.com", password: "wrongpassword" });
    expect(res.status).toBe(401);
  });

  it("rejects /auth/me without a token with 401", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("sets an httpOnly auth cookie on login and authenticates subsequent requests with it", async () => {
    await request(app).post("/auth/register").send(registerPayload);

    const agent = request.agent(app);
    const loginRes = await agent
      .post("/auth/login")
      .send({ email: "owner@acme.com", password: "supersecret" });

    const setCookie = loginRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieHeader = (setCookie as unknown as string[]).join(";");
    expect(cookieHeader).toContain("token=");
    expect(cookieHeader.toLowerCase()).toContain("httponly");

    const meRes = await agent.get("/auth/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe("owner@acme.com");
  });

  it("clears the auth cookie on logout", async () => {
    await request(app).post("/auth/register").send(registerPayload);

    const agent = request.agent(app);
    await agent.post("/auth/login").send({ email: "owner@acme.com", password: "supersecret" });
    expect((await agent.get("/auth/me")).status).toBe(200);

    const logoutRes = await agent.post("/auth/logout");
    expect(logoutRes.status).toBe(204);

    const meRes = await agent.get("/auth/me");
    expect(meRes.status).toBe(401);
  });
});
