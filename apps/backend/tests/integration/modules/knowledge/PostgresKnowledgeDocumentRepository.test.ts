import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresKnowledgeDocumentRepository } from "@modules/knowledge/infrastructure/persistence/PostgresKnowledgeDocumentRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { KnowledgeDocument } from "@modules/knowledge/domain/KnowledgeDocument.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresKnowledgeDocumentRepository", () => {
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
      "TRUNCATE document_chunks, knowledge_documents, businesses RESTART IDENTITY CASCADE",
    );
    const businessRepo = new PostgresBusinessRepository(db);
    const business = Business.create({ name: "Acme", email: "biz@acme.com", slug: "acme" }).value;
    await businessRepo.save(business);
    businessId = business.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("saves and retrieves a document", async () => {
    const repo = new PostgresKnowledgeDocumentRepository(db);
    const document = KnowledgeDocument.create({ businessId, title: "Catálogo", sourceType: "text" }).value;

    await repo.save(document);
    const found = await repo.findById(businessId, document.id);

    expect(found?.title).toBe("Catálogo");
    expect(found?.sourceType).toBe("text");
  });

  it("does not return a document scoped to another business", async () => {
    const repo = new PostgresKnowledgeDocumentRepository(db);
    const document = KnowledgeDocument.create({ businessId, title: "Catálogo", sourceType: "text" }).value;
    await repo.save(document);

    const found = await repo.findById("00000000-0000-0000-0000-000000000000", document.id);
    expect(found).toBeNull();
  });

  it("does not return a soft-deleted document", async () => {
    const repo = new PostgresKnowledgeDocumentRepository(db);
    const document = KnowledgeDocument.create({ businessId, title: "Catálogo", sourceType: "text" }).value;
    document.delete();
    await repo.save(document);

    expect(await repo.findById(businessId, document.id)).toBeNull();
    expect(await repo.countByBusinessId(businessId)).toBe(0);
  });

  it("counts only non-deleted documents for the business", async () => {
    const repo = new PostgresKnowledgeDocumentRepository(db);
    await repo.save(KnowledgeDocument.create({ businessId, title: "Uno", sourceType: "text" }).value);
    await repo.save(KnowledgeDocument.create({ businessId, title: "Dos", sourceType: "text" }).value);

    expect(await repo.countByBusinessId(businessId)).toBe(2);
  });

  it("paginates and orders findAll by newest first", async () => {
    const repo = new PostgresKnowledgeDocumentRepository(db);
    for (let i = 0; i < 3; i++) {
      await repo.save(KnowledgeDocument.create({ businessId, title: `Doc ${i}`, sourceType: "text" }).value);
    }

    const { items, total } = await repo.findAll(businessId, { limit: 2, offset: 0 });
    expect(total).toBe(3);
    expect(items).toHaveLength(2);
  });
});
