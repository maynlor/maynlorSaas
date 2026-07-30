import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresBusinessRepository", () => {
  let db: PgDbClient;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
  });

  beforeEach(async () => {
    await db.query("TRUNCATE businesses RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await db.close();
  });

  it("saves and retrieves a business by id", async () => {
    const repo = new PostgresBusinessRepository(db);
    const business = Business.create({ name: "Acme", email: "a@acme.com", slug: "acme" }).value;

    await repo.save(business);
    const found = await repo.findById(business.id);

    expect(found).not.toBeNull();
    expect(found?.name).toBe("Acme");
    expect(found?.email).toBe("a@acme.com");
    expect(found?.slug).toBe("acme");
  });

  it("returns null for a non-existent id", async () => {
    const repo = new PostgresBusinessRepository(db);
    const found = await repo.findById("00000000-0000-0000-0000-000000000000");
    expect(found).toBeNull();
  });

  it("existsByEmailOrSlug detects duplicates by slug or email", async () => {
    const repo = new PostgresBusinessRepository(db);
    const business = Business.create({ name: "Acme", email: "a@acme.com", slug: "acme" }).value;
    await repo.save(business);

    expect(await repo.existsByEmailOrSlug("a@acme.com", "other-slug")).toBe(true);
    expect(await repo.existsByEmailOrSlug("other@acme.com", "acme")).toBe(true);
    expect(await repo.existsByEmailOrSlug("other@acme.com", "other-slug")).toBe(false);
  });

  it("paginates findAll results", async () => {
    const repo = new PostgresBusinessRepository(db);
    for (let i = 0; i < 3; i++) {
      const business = Business.create({
        name: `Acme ${i}`,
        email: `acme${i}@acme.com`,
        slug: `acme-${i}`,
      }).value;
      await repo.save(business);
    }

    const { items, total } = await repo.findAll({ limit: 2, offset: 0 });
    expect(total).toBe(3);
    expect(items).toHaveLength(2);
  });
});
