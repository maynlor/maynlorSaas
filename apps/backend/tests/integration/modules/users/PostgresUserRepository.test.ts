import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresUserRepository } from "@modules/users/infrastructure/persistence/PostgresUserRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { User } from "@modules/users/domain/User.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresUserRepository", () => {
  let db: PgDbClient;
  let businessId: string;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
  });

  beforeEach(async () => {
    await db.query("TRUNCATE users, businesses RESTART IDENTITY CASCADE");
    const businessRepo = new PostgresBusinessRepository(db);
    const business = Business.create({
      name: "Acme",
      email: "biz@acme.com",
      slug: "acme",
    }).value;
    await businessRepo.save(business);
    businessId = business.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("saves and retrieves a user by id scoped to its business", async () => {
    const repo = new PostgresUserRepository(db);
    const user = User.create({
      businessId,
      email: "owner@acme.com",
      passwordHash: "hashed-password",
    }).value;

    await repo.save(user);
    const found = await repo.findById(businessId, user.id);

    expect(found).not.toBeNull();
    expect(found?.email).toBe("owner@acme.com");
    expect(found?.businessId).toBe(businessId);
  });

  it("does not find a user under a different business_id", async () => {
    const repo = new PostgresUserRepository(db);
    const user = User.create({
      businessId,
      email: "owner@acme.com",
      passwordHash: "hashed-password",
    }).value;
    await repo.save(user);

    const found = await repo.findById("00000000-0000-0000-0000-000000000000", user.id);
    expect(found).toBeNull();
  });

  it("finds a user by email without needing a business_id", async () => {
    const repo = new PostgresUserRepository(db);
    const user = User.create({
      businessId,
      email: "owner@acme.com",
      passwordHash: "hashed-password",
    }).value;
    await repo.save(user);

    const found = await repo.findByEmail("owner@acme.com");
    expect(found?.id).toBe(user.id);
  });

  it("existsByEmail reflects saved users", async () => {
    const repo = new PostgresUserRepository(db);
    expect(await repo.existsByEmail("owner@acme.com")).toBe(false);

    const user = User.create({
      businessId,
      email: "owner@acme.com",
      passwordHash: "hashed-password",
    }).value;
    await repo.save(user);

    expect(await repo.existsByEmail("owner@acme.com")).toBe(true);
  });
});
