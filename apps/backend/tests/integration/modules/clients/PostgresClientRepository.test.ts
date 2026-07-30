import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresClientRepository } from "@modules/clients/infrastructure/persistence/PostgresClientRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { Client } from "@modules/clients/domain/Client.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresClientRepository", () => {
  let db: PgDbClient;
  let businessId: string;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
  });

  beforeEach(async () => {
    await db.query("TRUNCATE messages, conversations, clients, businesses RESTART IDENTITY CASCADE");
    const businessRepo = new PostgresBusinessRepository(db);
    const business = Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
    await businessRepo.save(business);
    businessId = business.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("saves and retrieves a client by id scoped to its business", async () => {
    const repo = new PostgresClientRepository(db);
    const client = Client.create({ businessId, name: "Juan Pérez", phone: "+5491100000000" }).value;

    await repo.save(client);
    const found = await repo.findById(businessId, client.id);

    expect(found).not.toBeNull();
    expect(found?.name).toBe("Juan Pérez");
    expect(found?.phone).toBe("+5491100000000");
  });

  it("does not find a client under a different business_id", async () => {
    const repo = new PostgresClientRepository(db);
    const client = Client.create({ businessId, name: "Juan" }).value;
    await repo.save(client);

    const found = await repo.findById("00000000-0000-0000-0000-000000000000", client.id);
    expect(found).toBeNull();
  });

  it("existsByPhone reflects saved clients scoped by business", async () => {
    const repo = new PostgresClientRepository(db);
    expect(await repo.existsByPhone(businessId, "+5491100000000")).toBe(false);

    const client = Client.create({ businessId, name: "Juan", phone: "+5491100000000" }).value;
    await repo.save(client);

    expect(await repo.existsByPhone(businessId, "+5491100000000")).toBe(true);
  });

  it("paginates findAll results", async () => {
    const repo = new PostgresClientRepository(db);
    for (let i = 0; i < 3; i++) {
      const client = Client.create({ businessId, name: `Cliente ${i}` }).value;
      await repo.save(client);
    }

    const { items, total } = await repo.findAll(businessId, { limit: 2, offset: 0 });
    expect(total).toBe(3);
    expect(items).toHaveLength(2);
  });
});
