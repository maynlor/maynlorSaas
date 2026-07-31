import "dotenv/config";
import { Pool } from "pg";
import request from "supertest";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { createApp } from "../../../../src/app.js";
import type { ILogger } from "@shared/logger/Logger.js";
import type { AIProvider, GenerateTextInput } from "@modules/ai/application/providers/AIProvider.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

const noopLogger: ILogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const receivedInputs: GenerateTextInput[] = [];
const fakeAIProvider: AIProvider = {
  generateText: async (input) => {
    receivedInputs.push(input);
    return `[fake reply #${receivedInputs.length}]`;
  },
  transcribeAudio: async () => "[fake transcription]",
  embedText: async () => new Array(1536).fill(0),
};

describe("Conversations flow (client -> messages -> memory -> inbox)", () => {
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
    receivedInputs.length = 0;
    await db.query(
      "TRUNCATE messages, conversations, clients, users, businesses RESTART IDENTITY CASCADE",
    );
  });

  afterAll(async () => {
    await db.close();
  });

  async function registerAndGetToken() {
    const res = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme", email: "biz@acme.com", slug: "acme" },
        user: { email: "owner@acme.com", password: "supersecret" },
      });
    return res.body.token as string;
  }

  it("creates a client, starts a conversation, and remembers history across messages", async () => {
    const token = await registerAndGetToken();

    const clientRes = await request(app)
      .post("/clients")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Juan Pérez", phone: "+5491100000000" });
    expect(clientRes.status).toBe(201);
    const clientId = clientRes.body.id as string;

    const firstMsgRes = await request(app)
      .post("/conversations/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Hola", clientId });
    expect(firstMsgRes.status).toBe(200);
    expect(firstMsgRes.body.conversationId).toBeTypeOf("string");
    const conversationId = firstMsgRes.body.conversationId as string;

    expect(receivedInputs[0]?.messages).toEqual([{ role: "user", content: "Hola" }]);

    const secondMsgRes = await request(app)
      .post("/conversations/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "¿Tienen stock?", conversationId });
    expect(secondMsgRes.status).toBe(200);
    expect(secondMsgRes.body.conversationId).toBe(conversationId);

    expect(receivedInputs[1]?.messages).toEqual([
      { role: "user", content: "Hola" },
      { role: "assistant", content: "[fake reply #1]" },
      { role: "user", content: "¿Tienen stock?" },
    ]);

    const listRes = await request(app)
      .get("/conversations")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);
    expect(listRes.body.items[0].id).toBe(conversationId);

    const messagesRes = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${token}`);
    expect(messagesRes.status).toBe(200);
    expect(messagesRes.body.items).toHaveLength(4);
    expect(messagesRes.body.items.map((m: { role: string }) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
  });

  it("requires clientId when starting a conversation without conversationId", async () => {
    const token = await registerAndGetToken();

    const res = await request(app)
      .post("/conversations/messages")
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Hola" });

    expect(res.status).toBe(400);
  });

  it("never lets one tenant read another tenant's conversations", async () => {
    const tokenA = await registerAndGetToken();
    const clientRes = await request(app)
      .post("/clients")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ name: "Cliente A" });
    const sendRes = await request(app)
      .post("/conversations/messages")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ message: "Hola", clientId: clientRes.body.id });
    const conversationId = sendRes.body.conversationId as string;

    const tokenBRes = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Zeta", email: "biz@zeta.com", slug: "zeta" },
        user: { email: "owner@zeta.com", password: "supersecret" },
      });
    const tokenB = tokenBRes.body.token as string;

    const res = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});
