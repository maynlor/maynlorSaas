import { describe, it, expect, vi } from "vitest";
import { GetAnalyticsSummaryUseCase } from "@modules/analytics/application/use-cases/GetAnalyticsSummaryUseCase.js";
import type { IAnalyticsRepository } from "@modules/analytics/application/repositories/IAnalyticsRepository.js";
import type { IConversationRepository } from "@modules/conversations/application/repositories/IConversationRepository.js";
import type { PlanLimitReader } from "@modules/subscriptions/application/services/PlanLimitReader.js";
import type { AnalyticsTotalsDTO } from "@modules/analytics/application/dtos/AnalyticsDTO.js";

const businessId = "b1";

function buildTotals(overrides: Partial<AnalyticsTotalsDTO> = {}): AnalyticsTotalsDTO {
  return {
    conversations: 10,
    messages: 20,
    clients: 3,
    products: 5,
    services: 2,
    faqs: 1,
    knowledgeDocuments: 4,
    ...overrides,
  };
}

function analyticsRepoMock(overrides: Partial<IAnalyticsRepository> = {}): IAnalyticsRepository {
  return {
    getTotals: vi.fn().mockResolvedValue(buildTotals()),
    getConversationsPerDay: vi.fn().mockResolvedValue([]),
    getMessagesPerDay: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function conversationRepoMock(countThisMonth = 0): IConversationRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findLatestByClientAndChannel: vi.fn(),
    countCreatedSince: vi.fn().mockResolvedValue(countThisMonth),
  };
}

function planLimitReaderMock(limits: Record<string, number | null> = {}): PlanLimitReader {
  return {
    getLimit: vi.fn().mockImplementation((_businessId: string, resource: string) => Promise.resolve(limits[resource] ?? null)),
  } as unknown as PlanLimitReader;
}

describe("GetAnalyticsSummaryUseCase", () => {
  it("returns totals, both daily series, and plan usage together", async () => {
    const analyticsRepo = analyticsRepoMock({
      getConversationsPerDay: vi.fn().mockResolvedValue([{ date: "2026-07-01", count: 3 }]),
      getMessagesPerDay: vi.fn().mockResolvedValue([{ date: "2026-07-01", count: 6 }]),
    });
    const useCase = new GetAnalyticsSummaryUseCase(
      analyticsRepo,
      conversationRepoMock(7),
      planLimitReaderMock({ products: 20, services: 10, conversations: 200, knowledgeDocuments: 5 }),
    );

    const result = await useCase.execute(businessId);

    expect(result.isSuccess).toBe(true);
    expect(result.value.totals.conversations).toBe(10);
    expect(result.value.conversationsPerDay).toEqual([{ date: "2026-07-01", count: 3 }]);
    expect(result.value.messagesPerDay).toEqual([{ date: "2026-07-01", count: 6 }]);
  });

  it("measures conversation usage against the monthly window, not the all-time total", async () => {
    // A diferencia de products/services/knowledgeDocuments (tope total),
    // conversations es un límite MENSUAL — "usado" tiene que salir de
    // countCreatedSince(inicio de mes), no del total histórico.
    const analyticsRepo = analyticsRepoMock({ getTotals: vi.fn().mockResolvedValue(buildTotals({ conversations: 999 })) });
    const useCase = new GetAnalyticsSummaryUseCase(
      analyticsRepo,
      conversationRepoMock(7),
      planLimitReaderMock({ conversations: 200 }),
    );

    const result = await useCase.execute(businessId);

    const conversationsUsage = result.value.planUsage.find((u) => u.resource === "conversations");
    expect(conversationsUsage).toEqual({ resource: "conversations", used: 7, limit: 200 });
  });

  it("reports the all-time total as usage for products, services, and documents", async () => {
    const analyticsRepo = analyticsRepoMock({
      getTotals: vi.fn().mockResolvedValue(buildTotals({ products: 12, services: 4, knowledgeDocuments: 2 })),
    });
    const useCase = new GetAnalyticsSummaryUseCase(
      analyticsRepo,
      conversationRepoMock(0),
      planLimitReaderMock({ products: 20, services: 10, knowledgeDocuments: 5 }),
    );

    const result = await useCase.execute(businessId);

    expect(result.value.planUsage).toEqual(
      expect.arrayContaining([
        { resource: "products", used: 12, limit: 20 },
        { resource: "services", used: 4, limit: 10 },
        { resource: "knowledgeDocuments", used: 2, limit: 5 },
      ]),
    );
  });

  it("reports unlimited (null) resources without a numeric cap", async () => {
    const useCase = new GetAnalyticsSummaryUseCase(
      analyticsRepoMock(),
      conversationRepoMock(0),
      planLimitReaderMock({}), // sin entradas -> todos null (ilimitado)
    );

    const result = await useCase.execute(businessId);

    for (const usage of result.value.planUsage) {
      expect(usage.limit).toBeNull();
    }
  });
});
