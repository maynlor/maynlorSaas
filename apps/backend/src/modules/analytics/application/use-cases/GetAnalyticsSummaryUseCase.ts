import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { startOfCurrentMonth } from "../../../../shared/date/startOfCurrentMonth.js";
import type { IAnalyticsRepository } from "../repositories/IAnalyticsRepository.js";
import type { PlanLimitReader, LimitedResource } from "../../../subscriptions/application/services/PlanLimitReader.js";
import type { IConversationRepository } from "../../../conversations/application/repositories/IConversationRepository.js";
import type { AnalyticsSummaryDTO, AnalyticsTotalsDTO, PlanUsageDTO } from "../dtos/AnalyticsDTO.js";

const DAYS_IN_SERIES = 30;

/**
 * `conversations` es el único límite de plan medido por mes (los demás son
 * un tope total), así que su "usado" no sale de `totals` sino de la misma
 * ventana mensual que aplica `SendMessageUseCase` al hacer cumplir el límite.
 */
const PLAN_USAGE_RESOURCES: LimitedResource[] = ["products", "services", "conversations", "knowledgeDocuments"];

export class GetAnalyticsSummaryUseCase {
  constructor(
    private readonly analyticsRepository: IAnalyticsRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly planLimitReader: PlanLimitReader,
  ) {}

  async execute(businessId: string): Promise<Result<AnalyticsSummaryDTO, AppError>> {
    const [totals, conversationsPerDay, messagesPerDay, conversationsThisMonth] = await Promise.all([
      this.analyticsRepository.getTotals(businessId),
      this.analyticsRepository.getConversationsPerDay(businessId, DAYS_IN_SERIES),
      this.analyticsRepository.getMessagesPerDay(businessId, DAYS_IN_SERIES),
      this.conversationRepository.countCreatedSince(businessId, startOfCurrentMonth()),
    ]);

    const planUsage = await this.getPlanUsage(businessId, totals, conversationsThisMonth);

    return Result.ok({ totals, conversationsPerDay, messagesPerDay, planUsage });
  }

  private async getPlanUsage(
    businessId: string,
    totals: AnalyticsTotalsDTO,
    conversationsThisMonth: number,
  ): Promise<PlanUsageDTO[]> {
    const usedByResource: Record<LimitedResource, number> = {
      products: totals.products,
      services: totals.services,
      conversations: conversationsThisMonth,
      knowledgeDocuments: totals.knowledgeDocuments,
    };

    return Promise.all(
      PLAN_USAGE_RESOURCES.map(async (resource) => ({
        resource,
        used: usedByResource[resource],
        limit: await this.planLimitReader.getLimit(businessId, resource),
      })),
    );
  }
}
