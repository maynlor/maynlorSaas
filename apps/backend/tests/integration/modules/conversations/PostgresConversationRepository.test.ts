import "dotenv/config";
import { Pool } from "pg";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { PgDbClient } from "@shared/database/PgDbClient.js";
import { runMigrations } from "@shared/database/migrate.js";
import { PostgresBusinessRepository } from "@modules/businesses/infrastructure/persistence/PostgresBusinessRepository.js";
import { PostgresClientRepository } from "@modules/clients/infrastructure/persistence/PostgresClientRepository.js";
import { PostgresConversationRepository } from "@modules/conversations/infrastructure/persistence/PostgresConversationRepository.js";
import { PostgresMessageRepository } from "@modules/conversations/infrastructure/persistence/PostgresMessageRepository.js";
import { Business } from "@modules/businesses/domain/Business.js";
import { Client } from "@modules/clients/domain/Client.js";
import { Conversation } from "@modules/conversations/domain/Conversation.js";
import { Message } from "@modules/conversations/domain/Message.js";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://saasbot:saasbot@localhost:5433/saasbot_test";

describe("PostgresConversationRepository + PostgresMessageRepository", () => {
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
    await db.query("TRUNCATE messages, conversations, clients, businesses RESTART IDENTITY CASCADE");
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

  it("saves and retrieves a conversation scoped to its business", async () => {
    const repo = new PostgresConversationRepository(db);
    const conversation = Conversation.create({ businessId, clientId });

    await repo.save(conversation);
    const found = await repo.findById(businessId, conversation.id);

    expect(found).not.toBeNull();
    expect(found?.clientId).toBe(clientId);
    expect(found?.channel).toBe("api");
  });

  it("does not find a conversation under a different business_id", async () => {
    const repo = new PostgresConversationRepository(db);
    const conversation = Conversation.create({ businessId, clientId });
    await repo.save(conversation);

    const found = await repo.findById("00000000-0000-0000-0000-000000000000", conversation.id);
    expect(found).toBeNull();
  });

  it("saves messages and retrieves them in chronological order", async () => {
    const conversationRepo = new PostgresConversationRepository(db);
    const messageRepo = new PostgresMessageRepository(db);
    const conversation = Conversation.create({ businessId, clientId });
    await conversationRepo.save(conversation);

    const firstMessage = Message.create({
      conversationId: conversation.id,
      businessId,
      role: "user",
      content: "Hola",
    });
    await messageRepo.save(firstMessage);
    const secondMessage = Message.create({
      conversationId: conversation.id,
      businessId,
      role: "assistant",
      content: "¡Hola! ¿En qué te ayudo?",
    });
    await messageRepo.save(secondMessage);

    const { items, total } = await messageRepo.findByConversationId(businessId, conversation.id, {
      limit: 50,
      offset: 0,
    });

    expect(total).toBe(2);
    expect(items[0]?.content).toBe("Hola");
    expect(items[1]?.content).toBe("¡Hola! ¿En qué te ayudo?");
  });

  it("paginates conversations findAll", async () => {
    const repo = new PostgresConversationRepository(db);
    for (let i = 0; i < 3; i++) {
      await repo.save(Conversation.create({ businessId, clientId }));
    }

    const { items, total } = await repo.findAll(businessId, { limit: 2, offset: 0 });
    expect(total).toBe(3);
    expect(items).toHaveLength(2);
  });
});
