import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresServiceRepository } from "@modules/services/infrastructure/persistence/PostgresServiceRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { Service } from "@modules/services/domain/Service.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresServiceRepository", () => {
  let db: PgDbClient;
  let businessId: string;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
  });

  beforeEach(async () => {
    await db.query(
      "TRUNCATE messages, conversations, clients, products, services, faqs, businesses RESTART IDENTITY CASCADE",
    );
    const businessRepo = new PostgresBusinessRepository(db);
    const business = Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
    await businessRepo.save(business);
    businessId = business.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("saves and retrieves a service by id scoped to its business", async () => {
    const repo = new PostgresServiceRepository(db);
    const service = Service.create({
      businessId,
      name: "Corte de pelo",
      description: "Corte clásico",
      price: 8000,
      durationMinutes: 30,
    }).value;

    await repo.save(service);
    const found = await repo.findById(businessId, service.id);

    expect(found).not.toBeNull();
    expect(found?.name).toBe("Corte de pelo");
    expect(found?.price).toBe(8000);
    expect(found?.durationMinutes).toBe(30);
  });

  it("does not find a service under a different business_id", async () => {
    const repo = new PostgresServiceRepository(db);
    const service = Service.create({ businessId, name: "Corte", price: 100 }).value;
    await repo.save(service);

    const found = await repo.findById("00000000-0000-0000-0000-000000000000", service.id);
    expect(found).toBeNull();
  });

  it("excludes soft-deleted services and searches only active ones", async () => {
    const repo = new PostgresServiceRepository(db);
    const active = Service.create({ businessId, name: "Corte de pelo", price: 100 }).value;
    const inactive = Service.create({
      businessId,
      name: "Corte viejo",
      price: 50,
      isActive: false,
    }).value;
    const deleted = Service.create({ businessId, name: "Corte eliminado", price: 10 }).value;
    await repo.save(active);
    await repo.save(inactive);
    deleted.delete();
    await repo.save(deleted);

    const results = await repo.search(businessId, "corte", 10);
    expect(results.map((s) => s.name)).toEqual(["Corte de pelo"]);

    const { total } = await repo.findAll(businessId, { limit: 10, offset: 0 });
    expect(total).toBe(2);
  });
});
