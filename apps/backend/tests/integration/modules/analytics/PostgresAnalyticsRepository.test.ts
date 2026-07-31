import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresAnalyticsRepository } from "@modules/analytics/infrastructure/persistence/PostgresAnalyticsRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresAnalyticsRepository", () => {
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
      "TRUNCATE messages, conversations, clients, products, services, faqs, knowledge_documents, businesses RESTART IDENTITY CASCADE",
    );
    const businessRepo = new PostgresBusinessRepository(db);
    const business = Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
    await businessRepo.save(business);
    businessId = business.id;

    const client = await db.query<{ id: string }>(
      `INSERT INTO clients (business_id, name) VALUES ($1, 'Cliente') RETURNING id`,
      [businessId],
    );
    clientId = client.rows[0]!.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("counts totals scoped to the business, excluding soft-deleted rows", async () => {
    const repo = new PostgresAnalyticsRepository(db);
    await db.query(
      `INSERT INTO products (business_id, name, price, is_active) VALUES ($1,'P1',10,true), ($1,'P2',20,true)`,
      [businessId],
    );
    await db.query(
      `INSERT INTO products (business_id, name, price, is_active, deleted_at) VALUES ($1,'Borrado',5,true,now())`,
      [businessId],
    );

    const totals = await repo.getTotals(businessId);

    expect(totals.products).toBe(2);
    expect(totals.clients).toBe(1);
  });

  it("does not count another business's data in totals", async () => {
    const businessRepo = new PostgresBusinessRepository(db);
    const otherBusiness = Business.create({ name: "Otra", email: "otra@acme.com", slug: "otra" }).value;
    await businessRepo.save(otherBusiness);
    await db.query(`INSERT INTO products (business_id, name, price, is_active) VALUES ($1,'Ajeno',1,true)`, [
      otherBusiness.id,
    ]);

    const repo = new PostgresAnalyticsRepository(db);
    const totals = await repo.getTotals(businessId);

    expect(totals.products).toBe(0);
  });

  it("fills days with no activity as zero, in chronological order", async () => {
    const repo = new PostgresAnalyticsRepository(db);
    // Una sola conversación, hoy — el resto de los ultimos 7 dias no tiene actividad.
    const conv = await db.query<{ id: string }>(
      `INSERT INTO conversations (business_id, client_id, channel) VALUES ($1,$2,'api') RETURNING id`,
      [businessId, clientId],
    );

    const series = await repo.getConversationsPerDay(businessId, 7);

    expect(series).toHaveLength(7);
    const zeroDays = series.filter((d) => d.count === 0);
    expect(zeroDays).toHaveLength(6);
    expect(series[series.length - 1]!.count).toBe(1); // hoy es el último día de la serie
    // Orden cronológico ascendente.
    const dates = series.map((d) => d.date);
    expect(dates).toEqual([...dates].sort());
    expect(conv.rows).toHaveLength(1);
  });

  it("counts multiple conversations on the same day together", async () => {
    const repo = new PostgresAnalyticsRepository(db);
    await db.query(
      `INSERT INTO conversations (business_id, client_id, channel) VALUES ($1,$2,'api'), ($1,$2,'whatsapp')`,
      [businessId, clientId],
    );

    const series = await repo.getConversationsPerDay(businessId, 7);

    expect(series[series.length - 1]!.count).toBe(2);
  });

  it("counts messages independently from conversations", async () => {
    const repo = new PostgresAnalyticsRepository(db);
    const conv = await db.query<{ id: string }>(
      `INSERT INTO conversations (business_id, client_id, channel) VALUES ($1,$2,'api') RETURNING id`,
      [businessId, clientId],
    );
    await db.query(
      `INSERT INTO messages (conversation_id, business_id, role, content) VALUES
       ($1,$2,'user','hola'), ($1,$2,'assistant','hola, en que te ayudo?')`,
      [conv.rows[0]!.id, businessId],
    );

    const conversations = await repo.getConversationsPerDay(businessId, 7);
    const messages = await repo.getMessagesPerDay(businessId, 7);

    expect(conversations[conversations.length - 1]!.count).toBe(1);
    expect(messages[messages.length - 1]!.count).toBe(2);
  });
});
