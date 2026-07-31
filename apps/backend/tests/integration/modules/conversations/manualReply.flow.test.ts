import "dotenv/config";
import { Pool } from "pg";
import request from "supertest";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { createApp } from "../../../../src/app.js";
import type { ILogger } from "@shared/logger/Logger.js";
import type { AIProvider } from "@modules/ai/application/providers/AIProvider.js";
import type { WhatsAppClient } from "@modules/whatsapp/application/providers/WhatsAppClient.js";
import type { IBackgroundRunner } from "@shared/background/BackgroundRunner.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

const noopLogger: ILogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

let aiCallCount = 0;
const fakeAIProvider: AIProvider = {
  generateText: async () => {
    aiCallCount += 1;
    return { text: `[bot reply #${aiCallCount}]` };
  },
  transcribeAudio: async () => "",
  embedText: async () => new Array(1536).fill(0),
  describeImage: async () => "",
};

const sentMessages: { to: string; body: string }[] = [];
const fakeWhatsAppClient: WhatsAppClient = {
  sendTextMessage: async (_phoneNumberId, to, body) => {
    sentMessages.push({ to, body });
  },
  sendButtonsMessage: async (_phoneNumberId, to, bodyText) => {
    sentMessages.push({ to, body: bodyText });
  },
  downloadMedia: async () => ({ buffer: Buffer.from(""), mimeType: "application/octet-stream" }),
};

function incomingPayload(phoneNumberId: string, from: string, text: string) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "1555", phone_number_id: phoneNumberId },
              contacts: [{ profile: { name: "Ana" }, wa_id: from }],
              messages: [
                {
                  from,
                  id: `wamid-${crypto.randomUUID()}`,
                  timestamp: "0",
                  type: "text",
                  text: { body: text },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe("Manual reply from the panel", () => {
  let db: PgDbClient;
  let app: ReturnType<typeof createApp>;
  let token: string;

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
      {
        verifyToken: "test-verify-token",
        accessToken: undefined,
        appSecret: undefined,
        apiVersion: "v21.0",
      },
      fakeWhatsAppClient,
    );
  });

  beforeEach(async () => {
    aiCallCount = 0;
    sentMessages.length = 0;
    await db.query(
      "TRUNCATE whatsapp_inbound_messages, messages, conversations, clients, users, businesses RESTART IDENTITY CASCADE",
    );

    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme", email: "biz@acme.com", slug: "acme" },
        user: { email: "owner@acme.com", password: "supersecret" },
      });
    token = registerRes.body.token as string;

    await request(app)
      .patch("/businesses/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ phoneNumberId: "pn-manual" });
  });

  afterAll(async () => {
    await db.close();
  });

  async function customerWrites(text: string) {
    await request(app)
      .post("/webhooks/whatsapp")
      .send(incomingPayload("pn-manual", "5491100000000", text));
    await (app.locals["backgroundRunner"] as IBackgroundRunner).whenIdle();
  }

  async function firstConversationId(): Promise<string> {
    const res = await request(app).get("/conversations").set("Authorization", `Bearer ${token}`);
    return res.body.items[0].id as string;
  }

  it("delivers a human reply over WhatsApp and stops the bot from answering", async () => {
    await customerWrites("Hola");
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.body).toBe("[bot reply #1]");

    const conversationId = await firstConversationId();

    const replyRes = await request(app)
      .post(`/conversations/${conversationId}/reply`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Te atiendo yo, Ana" });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.role).toBe("agent");
    expect(sentMessages).toHaveLength(2);
    expect(sentMessages[1]).toEqual({ to: "5491100000000", body: "Te atiendo yo, Ana" });

    // Desde acá el bot no contesta más en esta conversación.
    await customerWrites("¿Me lo mandás hoy?");

    expect(aiCallCount).toBe(1);
    expect(sentMessages).toHaveLength(2);

    // Pero el mensaje del cliente sí queda guardado: es lo que ve quien atiende.
    const messagesRes = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${token}`);
    const contents = messagesRes.body.items.map((m: { content: string }) => m.content);
    expect(contents).toContain("¿Me lo mandás hoy?");
  });

  it("hands the conversation back to the bot when asked", async () => {
    await customerWrites("Hola");
    const conversationId = await firstConversationId();

    await request(app)
      .post(`/conversations/${conversationId}/reply`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Sigo yo" });

    const resumeRes = await request(app)
      .patch(`/conversations/${conversationId}/bot`)
      .set("Authorization", `Bearer ${token}`)
      .send({ paused: false });

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.botPaused).toBe(false);

    await customerWrites("¿Seguís ahí?");

    expect(aiCallCount).toBe(2);
    expect(sentMessages[sentMessages.length - 1]?.body).toBe("[bot reply #2]");
  });

  it("exposes the paused state in the conversation list", async () => {
    await customerWrites("Hola");
    const conversationId = await firstConversationId();

    await request(app)
      .post(`/conversations/${conversationId}/reply`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Sigo yo" });

    const res = await request(app).get("/conversations").set("Authorization", `Bearer ${token}`);

    expect(res.body.items[0].botPaused).toBe(true);
    expect(res.body.items[0].botPausedAt).toEqual(expect.any(String));
  });

  it("refuses to answer a conversation from another business", async () => {
    await customerWrites("Hola");
    const conversationId = await firstConversationId();

    const otherRes = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Otra", email: "otra@x.com", slug: "otra" },
        user: { email: "owner@otra.com", password: "supersecret" },
      });
    const otherToken = otherRes.body.token as string;

    const res = await request(app)
      .post(`/conversations/${conversationId}/reply`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ message: "Me meto donde no debo" });

    expect(res.status).toBe(404);
    expect(sentMessages).toHaveLength(1);
  });
});
