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

describe("GET /businesses/me", () => {
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

  it("returns the authenticated user's own business", async () => {
    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme", email: "biz@acme.com", slug: "acme" },
        user: { email: "owner@acme.com", password: "supersecret" },
      });
    const token = registerRes.body.token as string;

    const res = await request(app).get("/businesses/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("acme");
  });

  it("rejects the request without a token with 401", async () => {
    const res = await request(app).get("/businesses/me");
    expect(res.status).toBe(401);
  });

  it("never lets one tenant read another tenant's business", async () => {
    await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme", email: "biz@acme.com", slug: "acme" },
        user: { email: "owner@acme.com", password: "supersecret" },
      });
    const otherRegisterRes = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Zeta", email: "biz@zeta.com", slug: "zeta" },
        user: { email: "owner@zeta.com", password: "supersecret" },
      });
    const zetaToken = otherRegisterRes.body.token as string;

    const res = await request(app)
      .get("/businesses/me")
      .set("Authorization", `Bearer ${zetaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("zeta");
  });
});
