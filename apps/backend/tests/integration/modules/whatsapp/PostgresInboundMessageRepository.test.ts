import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresInboundMessageRepository } from "@modules/whatsapp/infrastructure/persistence/PostgresInboundMessageRepository.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresInboundMessageRepository", () => {
  let db: PgDbClient;
  let repo: PostgresInboundMessageRepository;

  beforeAll(async () => {
    const migrationPool = new Pool({ connectionString: TEST_DATABASE_URL });
    await runMigrations(migrationPool);
    await migrationPool.end();

    db = new PgDbClient(TEST_DATABASE_URL);
    repo = new PostgresInboundMessageRepository(db);
  });

  beforeEach(async () => {
    await db.query("TRUNCATE whatsapp_inbound_messages RESTART IDENTITY CASCADE");
  });

  afterAll(async () => {
    await db.close();
  });

  it("lets the first claim through and rejects the second", async () => {
    expect(await repo.claim("wamid-1", "pn-1")).toBe(true);
    expect(await repo.claim("wamid-1", "pn-1")).toBe(false);
  });

  it("keeps rejecting a message that was already completed", async () => {
    await repo.claim("wamid-2", "pn-1");
    await repo.markCompleted("wamid-2");

    expect(await repo.claim("wamid-2", "pn-1")).toBe(false);
  });

  it("allows reclaiming a message whose processing failed", async () => {
    await repo.claim("wamid-3", "pn-1");
    await repo.markFailed("wamid-3");

    // Un fallo transitorio (IA caída) tiene que poder reintentarse cuando Meta
    // reenvíe el mensaje; si no, el cliente se queda sin respuesta.
    expect(await repo.claim("wamid-3", "pn-1")).toBe(true);
  });

  it("rescues a claim left hanging by a process that died mid-processing", async () => {
    await repo.claim("wamid-4", "pn-1");
    expect(await repo.claim("wamid-4", "pn-1")).toBe(false);

    // Simula el reclamo huérfano envejeciéndolo más allá del umbral: sin este
    // rescate, un reinicio del servidor dejaría el mensaje en "processing" para
    // siempre y todo reintento lo descartaría como duplicado.
    await db.query(
      "UPDATE whatsapp_inbound_messages SET claimed_at = now() - interval '10 minutes' WHERE external_id = $1",
      ["wamid-4"],
    );

    expect(await repo.claim("wamid-4", "pn-1")).toBe(true);
  });

  it("stops reclaiming a message that keeps failing, to cap the cost of a poison payload", async () => {
    expect(await repo.claim("wamid-5", "pn-1")).toBe(true);
    for (let attempt = 2; attempt <= 5; attempt += 1) {
      await repo.markFailed("wamid-5");
      expect(await repo.claim("wamid-5", "pn-1")).toBe(true);
    }

    await repo.markFailed("wamid-5");
    expect(await repo.claim("wamid-5", "pn-1")).toBe(false);
  });

  it("treats each message id independently", async () => {
    expect(await repo.claim("wamid-a", "pn-1")).toBe(true);
    expect(await repo.claim("wamid-b", "pn-1")).toBe(true);
  });
});
