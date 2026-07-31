import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Pool } from "pg";
import request from "supertest";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { createApp } from "../../../../src/app.js";
import type { ILogger } from "@shared/logger/Logger.js";
import type { AIProvider } from "@modules/ai/application/providers/AIProvider.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// PDF real y chico (no uno mínimo armado a mano): una versión hecha a mano
// resultó frágil con la versión vieja de pdfjs que trae pdf-parse — fallaba
// de forma intermitente al parsearse dentro del ciclo de vida de una
// request de Express/supertest, aunque los bytes llegaban intactos. No es
// un bug de nuestro código: un PDF real de 80KB parsea bien en el mismo
// contexto exacto.
const SAMPLE_PDF = readFileSync(path.join(__dirname, "../../../fixtures/sample.pdf"));

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

const noopLogger: ILogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

const fakeAIProvider: AIProvider = {
  generateText: async () => "[fake reply]",
  transcribeAudio: async () => "[fake transcription]",
  embedText: async () => new Array(1536).fill(0.01),
};

describe("Knowledge documents flow", () => {
  let db: PgDbClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
    app = createApp(
      db,
      noopLogger,
      { jwtSecret: "test-only-secret-at-least-16-chars", jwtExpiresIn: "1h" },
      { openaiApiKey: undefined, openaiModel: "gpt-4o-mini" },
      fakeAIProvider,
    );
  });

  beforeEach(async () => {
    await db.query(
      "TRUNCATE document_chunks, knowledge_documents, subscriptions, businesses RESTART IDENTITY CASCADE",
    );
  });

  afterAll(async () => {
    await db.close();
  });

  async function registerBusiness(): Promise<string> {
    const response = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme", email: "acme@test.com", slug: "acme" },
        user: { email: "owner@acme.com", password: "password123" },
      });
    return response.body.token as string;
  }

  it("uploads a text document and lists it", async () => {
    const token = await registerBusiness();

    const uploadResponse = await request(app)
      .post("/knowledge-documents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Políticas de envío", content: "Enviamos a todo el país en 48 a 72hs hábiles." });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.title).toBe("Políticas de envío");
    expect(uploadResponse.body.sourceType).toBe("text");

    const listResponse = await request(app)
      .get("/knowledge-documents")
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.items).toHaveLength(1);
    expect(listResponse.body.total).toBe(1);
  });

  it("uploads a real PDF, extracting and indexing its text", async () => {
    const token = await registerBusiness();

    const response = await request(app)
      .post("/knowledge-documents/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "Horarios")
      .attach("file", SAMPLE_PDF, { filename: "horarios.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(201);
    expect(response.body.sourceType).toBe("pdf");
    expect(response.body.sourceFilename).toBe("horarios.pdf");
  });

  it("rejects a non-PDF file on the upload endpoint", async () => {
    const token = await registerBusiness();

    const response = await request(app)
      .post("/knowledge-documents/upload")
      .set("Authorization", `Bearer ${token}`)
      .field("title", "No es un PDF")
      .attach("file", Buffer.from("plain text content"), { filename: "nota.txt", contentType: "text/plain" });

    expect(response.status).toBe(400);
  });

  it("deletes a document and removes it from the list", async () => {
    const token = await registerBusiness();
    const uploadResponse = await request(app)
      .post("/knowledge-documents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Doc", content: "contenido" });
    const documentId = uploadResponse.body.id as string;

    const deleteResponse = await request(app)
      .delete(`/knowledge-documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteResponse.status).toBe(204);

    const listResponse = await request(app)
      .get("/knowledge-documents")
      .set("Authorization", `Bearer ${token}`);
    expect(listResponse.body.items).toHaveLength(0);
  });

  it("returns 404 when deleting a document that does not exist", async () => {
    const token = await registerBusiness();

    const response = await request(app)
      .delete("/knowledge-documents/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it("enforces the free plan's document limit", async () => {
    // El plan starter (auto-asignado al registrarse) permite 5 documentos.
    const token = await registerBusiness();

    for (let i = 0; i < 5; i++) {
      const response = await request(app)
        .post("/knowledge-documents")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: `Doc ${i}`, content: `contenido ${i}` });
      expect(response.status).toBe(201);
    }

    const sixth = await request(app)
      .post("/knowledge-documents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Doc 6", content: "contenido 6" });

    expect(sixth.status).toBe(402);
  });

  it("rejects requests without a valid token", async () => {
    const response = await request(app).get("/knowledge-documents");
    expect(response.status).toBe(401);
  });
});
