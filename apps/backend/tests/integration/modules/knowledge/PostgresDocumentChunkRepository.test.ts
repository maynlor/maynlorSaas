import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresKnowledgeDocumentRepository } from "@modules/knowledge/infrastructure/persistence/PostgresKnowledgeDocumentRepository.js";
import { PostgresDocumentChunkRepository } from "@modules/knowledge/infrastructure/persistence/PostgresDocumentChunkRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { KnowledgeDocument } from "@modules/knowledge/domain/KnowledgeDocument.js";
import { DocumentChunk } from "@modules/knowledge/domain/DocumentChunk.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";
const EMBEDDING_DIMENSIONS = 1536;

/** Vector disperso pero de la dimensión real de la columna, para controlar la similitud coseno esperada. */
function buildVector(nonZero: Record<number, number>): number[] {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  for (const [index, value] of Object.entries(nonZero)) {
    vector[Number(index)] = value;
  }
  return vector;
}

describe("PostgresDocumentChunkRepository", () => {
  let db: PgDbClient;
  let businessId: string;
  let documentId: string;

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

    const documentRepo = new PostgresKnowledgeDocumentRepository(db);
    const document = KnowledgeDocument.create({ businessId, title: "Doc", sourceType: "text" }).value;
    await documentRepo.save(document);
    documentId = document.id;
  });

  afterAll(async () => {
    await db.close();
  });

  it("ranks chunks by cosine similarity to the query embedding", async () => {
    const repo = new PostgresDocumentChunkRepository(db);
    const near = DocumentChunk.create({
      documentId,
      businessId,
      chunkIndex: 0,
      content: "Envíos gratis a partir de $50.000",
      embedding: buildVector({ 0: 1 }),
    });
    const far = DocumentChunk.create({
      documentId,
      businessId,
      chunkIndex: 1,
      content: "Horario de atención al cliente",
      embedding: buildVector({ 1: 1 }),
    });
    await repo.saveMany([far, near]); // orden de guardado intencionalmente invertido

    const query = buildVector({ 0: 0.9, 1: 0.1 }); // más parecido a `near`
    const results = await repo.searchSimilar(businessId, query, 5);

    expect(results).toHaveLength(2);
    expect(results[0]!.chunk.content).toBe("Envíos gratis a partir de $50.000");
    expect(results[0]!.similarity).toBeGreaterThan(results[1]!.similarity);
    expect(results[0]!.similarity).toBeGreaterThan(0.9);
  });

  it("scopes the search to the given business", async () => {
    const repo = new PostgresDocumentChunkRepository(db);
    await repo.saveMany([
      DocumentChunk.create({
        documentId,
        businessId,
        chunkIndex: 0,
        content: "Contenido de otra empresa",
        embedding: buildVector({ 0: 1 }),
      }),
    ]);

    const results = await repo.searchSimilar("00000000-0000-0000-0000-000000000000", buildVector({ 0: 1 }), 5);
    expect(results).toHaveLength(0);
  });

  it("respects the limit", async () => {
    const repo = new PostgresDocumentChunkRepository(db);
    await repo.saveMany(
      Array.from({ length: 5 }, (_, i) =>
        DocumentChunk.create({
          documentId,
          businessId,
          chunkIndex: i,
          content: `Fragmento ${i}`,
          embedding: buildVector({ [i]: 1 }),
        }),
      ),
    );

    const results = await repo.searchSimilar(businessId, buildVector({ 0: 1 }), 2);
    expect(results).toHaveLength(2);
  });

  it("deletes all chunks belonging to a document", async () => {
    const repo = new PostgresDocumentChunkRepository(db);
    await repo.saveMany([
      DocumentChunk.create({
        documentId,
        businessId,
        chunkIndex: 0,
        content: "a",
        embedding: buildVector({ 0: 1 }),
      }),
    ]);

    await repo.deleteByDocumentId(documentId);

    const results = await repo.searchSimilar(businessId, buildVector({ 0: 1 }), 5);
    expect(results).toHaveLength(0);
  });
});
