import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresProductRepository } from "@modules/products/infrastructure/persistence/PostgresProductRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { Product } from "@modules/products/domain/Product.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresProductRepository", () => {
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
      "TRUNCATE messages, conversations, clients, products, businesses RESTART IDENTITY CASCADE",
    );
    const businessRepo = new PostgresBusinessRepository(db);
    const business = Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
    await businessRepo.save(business);
    businessId = business.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("saves and retrieves a product by id scoped to its business", async () => {
    const repo = new PostgresProductRepository(db);
    const product = Product.create({
      businessId,
      name: "Remera negra",
      description: "Algodón talle M",
      price: 15999.99,
      stock: 10,
    }).value;

    await repo.save(product);
    const found = await repo.findById(businessId, product.id);

    expect(found).not.toBeNull();
    expect(found?.name).toBe("Remera negra");
    expect(found?.price).toBe(15999.99);
    expect(found?.currency).toBe("ARS");
    expect(found?.stock).toBe(10);
  });

  it("does not find a product under a different business_id", async () => {
    const repo = new PostgresProductRepository(db);
    const product = Product.create({ businessId, name: "Remera", price: 100 }).value;
    await repo.save(product);

    const found = await repo.findById("00000000-0000-0000-0000-000000000000", product.id);
    expect(found).toBeNull();
  });

  it("updates a product on save (upsert)", async () => {
    const repo = new PostgresProductRepository(db);
    const product = Product.create({ businessId, name: "Remera", price: 100 }).value;
    await repo.save(product);

    product.update({ price: 250, stock: 3 });
    await repo.save(product);

    const found = await repo.findById(businessId, product.id);
    expect(found?.price).toBe(250);
    expect(found?.stock).toBe(3);
  });

  it("excludes soft-deleted products from findById and findAll", async () => {
    const repo = new PostgresProductRepository(db);
    const product = Product.create({ businessId, name: "Remera", price: 100 }).value;
    await repo.save(product);

    product.delete();
    await repo.save(product);

    expect(await repo.findById(businessId, product.id)).toBeNull();
    const { total } = await repo.findAll(businessId, { limit: 10, offset: 0 });
    expect(total).toBe(0);
  });

  it("searches by name or description, only active products, scoped by business", async () => {
    const repo = new PostgresProductRepository(db);
    const shirt = Product.create({
      businessId,
      name: "Remera negra",
      description: "Algodón",
      price: 100,
    }).value;
    const cap = Product.create({
      businessId,
      name: "Gorra",
      description: "Gorra con visera de algodón",
      price: 50,
    }).value;
    const inactive = Product.create({
      businessId,
      name: "Remera vieja",
      price: 10,
      isActive: false,
    }).value;
    await repo.save(shirt);
    await repo.save(cap);
    await repo.save(inactive);

    const byName = await repo.search(businessId, "remera", 10);
    expect(byName.map((p) => p.name)).toEqual(["Remera negra"]);

    const byDescription = await repo.search(businessId, "algodón", 10);
    expect(byDescription.map((p) => p.name).sort()).toEqual(["Gorra", "Remera negra"]);

    const otherTenant = await repo.search("00000000-0000-0000-0000-000000000000", "remera", 10);
    expect(otherTenant).toHaveLength(0);
  });

  it("paginates findAll results", async () => {
    const repo = new PostgresProductRepository(db);
    for (let i = 0; i < 3; i++) {
      const product = Product.create({ businessId, name: `Producto ${i}`, price: i * 10 }).value;
      await repo.save(product);
    }

    const { items, total } = await repo.findAll(businessId, { limit: 2, offset: 0 });
    expect(total).toBe(3);
    expect(items).toHaveLength(2);
  });
});
