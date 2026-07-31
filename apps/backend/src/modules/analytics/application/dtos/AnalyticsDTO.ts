export interface DailyCountDTO {
  /** YYYY-MM-DD */
  date: string;
  count: number;
}

export interface PlanUsageDTO {
  resource: "products" | "services" | "conversations" | "knowledgeDocuments";
  used: number;
  /** null = ilimitado. */
  limit: number | null;
}

export interface AnalyticsTotalsDTO {
  conversations: number;
  messages: number;
  clients: number;
  products: number;
  services: number;
  faqs: number;
  knowledgeDocuments: number;
}

export interface AnalyticsSummaryDTO {
  totals: AnalyticsTotalsDTO;
  conversationsPerDay: DailyCountDTO[];
  messagesPerDay: DailyCountDTO[];
  planUsage: PlanUsageDTO[];
}
