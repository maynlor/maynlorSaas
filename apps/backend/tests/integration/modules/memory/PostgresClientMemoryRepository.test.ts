import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresClientRepository } from "@modules/clients/infrastructure/persistence/PostgresClientRepository.js";
import { PostgresClientMemoryRepository } from "@modules/memory/infrastructure/persistence/PostgresClientMemoryRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { Client } from "@modules/clients/domain/Client.js";
import { ClientMemory } from "@modules/memory/domain/ClientMemory.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresClientMemoryRepository", () => {
  let db: PgDbClient;
  let businessId: string;
  let clientId: string;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
  });

  beforeEach(async () => {
    await db.query(
      "TRUNCATE messages, conversations, client_memories, clients, products, services, faqs, subscriptions, businesses RESTART IDENTITY CASCADE",
    );
    const businessRepo = new PostgresBusinessRepository(db);
    const business = Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
    await businessRepo.save(business);
    businessId = business.id;

    const clientRepo = new PostgresClientRepository(db);
    const client = Client.create({ businessId, name: "Juan" }).value;
    await clientRepo.save(client);
    clientId = client.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("saves and retrieves memory entries scoped to business and client, newest first", async () => {
    const repo = new PostgresClientMemoryRepository(db);
    const first = ClientMemory.create({ businessId, clientId, content: "Nombre: Juan" }).value;
    await repo.save(first);
    const second = ClientMemory.create({ businessId, clientId, content: "Prefiere entrega por la tarde" })
      .value;
    await repo.save(second);

    const memories = await repo.findByClientId(businessId, clientId, 10);

    expect(memories).toHaveLength(2);
    expect(memories[0]?.content).toBe("Prefiere entrega por la tarde");
  });

  it("does not find memories under a different business_id", async () => {
    const repo = new PostgresClientMemoryRepository(db);
    const memory = ClientMemory.create({ businessId, clientId, content: "Algo" }).value;
    await repo.save(memory);

    const found = await repo.findByClientId("00000000-0000-0000-0000-000000000000", clientId, 10);
    expect(found).toHaveLength(0);
  });

  it("deletes a memory entry scoped to the business", async () => {
    const repo = new PostgresClientMemoryRepository(db);
    const memory = ClientMemory.create({ businessId, clientId, content: "Algo" }).value;
    await repo.save(memory);

    await repo.delete(businessId, memory.id);

    expect(await repo.findById(businessId, memory.id)).toBeNull();
  });
});
