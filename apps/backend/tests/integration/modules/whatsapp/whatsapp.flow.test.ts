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
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

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
    return { text: `[fake reply #${aiCallCount}]` };
  },
  transcribeAudio: async () => "[fake transcription]",
  embedText: async () => new Array(1536).fill(0),
  describeImage: async () => "[fake image description]",
};

const sentMessages: { phoneNumberId: string; to: string; body: string }[] = [];
const fakeWhatsAppClient: WhatsAppClient = {
  sendTextMessage: async (phoneNumberId, to, body) => {
    sentMessages.push({ phoneNumberId, to, body });
  },
  sendButtonsMessage: async (phoneNumberId, to, bodyText) => {
    sentMessages.push({ phoneNumberId, to, body: bodyText });
  },
  downloadMedia: async () => ({ buffer: Buffer.from(""), mimeType: "application/octet-stream" }),
};

function buildIncomingMessagePayload(phoneNumberId: string, from: string, text: string) {
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
              metadata: { display_phone_number: "15550001111", phone_number_id: phoneNumberId },
              contacts: [{ profile: { name: "Juan Pérez" }, wa_id: from }],
              messages: [
                { from, id: `wamid-${crypto.randomUUID()}`, timestamp: "0", type: "text", text: { body: text } },
              ],
            },
          },
        ],
      },
    ],
  };
}

function buildIncomingButtonReplyPayload(
  phoneNumberId: string,
  from: string,
  buttonId: string,
  buttonTitle: string,
) {
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
              metadata: { display_phone_number: "15550001111", phone_number_id: phoneNumberId },
              contacts: [{ profile: { name: "Juan Pérez" }, wa_id: from }],
              messages: [
                {
                  from,
                  id: `wamid-${crypto.randomUUID()}`,
                  timestamp: "0",
                  type: "interactive",
                  interactive: { type: "button_reply", button_reply: { id: buttonId, title: buttonTitle } },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe("WhatsApp webhook", () => {
  let db: PgDbClient;
  let app: ReturnType<typeof createApp>;

  /**
   * El webhook le contesta 200 a Meta antes de procesar, así que la respuesta
   * HTTP no significa que el trabajo haya terminado. `whenIdle()` espera al
   * procesamiento diferido sin volverlo síncrono.
   */
  async function postWebhook(payload: object) {
    const res = await request(app).post("/webhooks/whatsapp").send(payload);
    await (app.locals["backgroundRunner"] as IBackgroundRunner).whenIdle();
    return res;
  }

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
  });

  afterAll(async () => {
    await db.close();
  });

  it("responds to the verification handshake with the challenge when the token matches", async () => {
    const res = await request(app)
      .get("/webhooks/whatsapp")
      .query({ "hub.mode": "subscribe", "hub.verify_token": "test-verify-token", "hub.challenge": "12345" });

    expect(res.status).toBe(200);
    expect(res.text).toBe("12345");
  });

  it("rejects the verification handshake with 403 when the token does not match", async () => {
    const res = await request(app)
      .get("/webhooks/whatsapp")
      .query({ "hub.mode": "subscribe", "hub.verify_token": "wrong-token", "hub.challenge": "12345" });

    expect(res.status).toBe(403);
  });

  it("processes an incoming message, auto-creating the client and conversation, and remembers history", async () => {
    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme", email: "biz@acme.com", slug: "acme" },
        user: { email: "owner@acme.com", password: "supersecret" },
      });
    const token = registerRes.body.token as string;

    const linkRes = await request(app)
      .patch("/businesses/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ phoneNumberId: "pn-123" });
    expect(linkRes.status).toBe(200);

    const firstPayload = buildIncomingMessagePayload("pn-123", "5491100000000", "Hola");
    const firstRes = await postWebhook(firstPayload);
    expect(firstRes.status).toBe(200);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.to).toBe("5491100000000");
    expect(sentMessages[0]?.body).toBe("[fake reply #1]");

    const clientsRes = await request(app).get("/clients").set("Authorization", `Bearer ${token}`);
    expect(clientsRes.body.total).toBe(1);
    expect(clientsRes.body.items[0].name).toBe("Juan Pérez");
    expect(clientsRes.body.items[0].phone).toBe("5491100000000");

    const conversationsRes = await request(app)
      .get("/conversations")
      .set("Authorization", `Bearer ${token}`);
    expect(conversationsRes.body.total).toBe(1);
    expect(conversationsRes.body.items[0].channel).toBe("whatsapp");
    const conversationId = conversationsRes.body.items[0].id as string;

    const secondPayload = buildIncomingMessagePayload("pn-123", "5491100000000", "¿Tienen stock?");
    const secondRes = await postWebhook(secondPayload);
    expect(secondRes.status).toBe(200);

    expect(sentMessages).toHaveLength(2);

    const conversationsAfterRes = await request(app)
      .get("/conversations")
      .set("Authorization", `Bearer ${token}`);
    expect(conversationsAfterRes.body.total).toBe(1);
    expect(conversationsAfterRes.body.items[0].id).toBe(conversationId);

    const messagesRes = await request(app)
      .get(`/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${token}`);
    expect(messagesRes.body.items).toHaveLength(4);
  });

  it("treats a tapped button reply as the message text (title, not id)", async () => {
    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme 2", email: "biz2@acme.com", slug: "acme-2" },
        user: { email: "owner2@acme.com", password: "supersecret" },
      });
    const token = registerRes.body.token as string;

    await request(app)
      .patch("/businesses/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ phoneNumberId: "pn-456" });

    const payload = buildIncomingButtonReplyPayload("pn-456", "5491100000001", "opcion_1", "Rojo");
    const res = await postWebhook(payload);
    expect(res.status).toBe(200);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.to).toBe("5491100000001");

    const messagesRes = await request(app)
      .get(
        `/conversations/${
          (
            await request(app).get("/conversations").set("Authorization", `Bearer ${token}`)
          ).body.items[0].id
        }/messages`,
      )
      .set("Authorization", `Bearer ${token}`);
    expect(messagesRes.body.items[0].content).toBe("Rojo");
  });

  it("ignores a redelivery of the same message instead of replying twice", async () => {
    const registerRes = await request(app)
      .post("/auth/register")
      .send({
        business: { name: "Acme 3", email: "biz3@acme.com", slug: "acme-3" },
        user: { email: "owner3@acme.com", password: "supersecret" },
      });
    const token = registerRes.body.token as string;

    await request(app)
      .patch("/businesses/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ phoneNumberId: "pn-789" });

    // Exactamente el mismo payload dos veces: es lo que hace Meta cuando da la
    // primera entrega por fallida (por ejemplo, porque el ack tardó demasiado).
    const payload = buildIncomingMessagePayload("pn-789", "5491100000002", "Hola");
    expect((await postWebhook(payload)).status).toBe(200);
    expect((await postWebhook(payload)).status).toBe(200);

    // Sin deduplicación, el cliente recibía la respuesta dos veces, se pagaban
    // dos llamadas al LLM y quedaban cuatro mensajes en vez de dos.
    expect(sentMessages).toHaveLength(1);
    expect(aiCallCount).toBe(1);

    const conversationsRes = await request(app)
      .get("/conversations")
      .set("Authorization", `Bearer ${token}`);
    expect(conversationsRes.body.total).toBe(1);

    const messagesRes = await request(app)
      .get(`/conversations/${conversationsRes.body.items[0].id}/messages`)
      .set("Authorization", `Bearer ${token}`);
    expect(messagesRes.body.items).toHaveLength(2);
  });

  it("always responds 200 even when the phone_number_id is unknown", async () => {
    const payload = buildIncomingMessagePayload("unknown-number", "5491100000000", "Hola");
    const res = await postWebhook(payload);

    expect(res.status).toBe(200);
    expect(sentMessages).toHaveLength(0);
  });
});
