import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresFaqRepository } from "@modules/knowledge/infrastructure/persistence/PostgresFaqRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { Faq } from "@modules/knowledge/domain/Faq.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresFaqRepository", () => {
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

  it("saves and retrieves a FAQ by id scoped to its business", async () => {
    const repo = new PostgresFaqRepository(db);
    const faq = Faq.create({
      businessId,
      question: "¿Cuáles son los horarios de atención?",
      answer: "De lunes a viernes de 9 a 18 hs.",
    }).value;

    await repo.save(faq);
    const found = await repo.findById(businessId, faq.id);

    expect(found).not.toBeNull();
    expect(found?.question).toBe("¿Cuáles son los horarios de atención?");
    expect(found?.answer).toBe("De lunes a viernes de 9 a 18 hs.");
  });

  it("does not find a FAQ under a different business_id", async () => {
    const repo = new PostgresFaqRepository(db);
    const faq = Faq.create({ businessId, question: "¿Hacen envíos?", answer: "Sí." }).value;
    await repo.save(faq);

    const found = await repo.findById("00000000-0000-0000-0000-000000000000", faq.id);
    expect(found).toBeNull();
  });

  it("searches by question or answer, only active FAQs", async () => {
    const repo = new PostgresFaqRepository(db);
    const shipping = Faq.create({
      businessId,
      question: "¿Hacen envíos a domicilio?",
      answer: "Sí, a todo el país por correo.",
    }).value;
    const hours = Faq.create({
      businessId,
      question: "¿Cuáles son los horarios?",
      answer: "De 9 a 18 hs.",
    }).value;
    const inactive = Faq.create({
      businessId,
      question: "¿Envíos internacionales?",
      answer: "No por ahora.",
      isActive: false,
    }).value;
    await repo.save(shipping);
    await repo.save(hours);
    await repo.save(inactive);

    const byQuestion = await repo.search(businessId, "envíos", 5);
    expect(byQuestion.map((f) => f.question)).toEqual(["¿Hacen envíos a domicilio?"]);

    const byAnswer = await repo.search(businessId, "correo", 5);
    expect(byAnswer).toHaveLength(1);

    const soft = shipping;
    soft.delete();
    await repo.save(soft);
    const afterDelete = await repo.search(businessId, "envíos", 5);
    expect(afterDelete).toHaveLength(0);
  });
});
