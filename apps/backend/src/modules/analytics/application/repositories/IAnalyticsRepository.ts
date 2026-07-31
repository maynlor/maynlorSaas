import type { AnalyticsTotalsDTO, DailyCountDTO } from "../dtos/AnalyticsDTO.js";

export interface IAnalyticsRepository {
  getTotals(businessId: string): Promise<AnalyticsTotalsDTO>;
  /** Un punto por día en el rango, incluidos los días sin actividad (count: 0). */
  getConversationsPerDay(businessId: string, days: number): Promise<DailyCountDTO[]>;
  getMessagesPerDay(businessId: string, days: number): Promise<DailyCountDTO[]>;
}
