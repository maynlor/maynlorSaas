import type { IDbClient } from "../../../../shared/database/DbClient.js";
import type { IAnalyticsRepository } from "../../application/repositories/IAnalyticsRepository.js";
import type { AnalyticsTotalsDTO, DailyCountDTO } from "../../application/dtos/AnalyticsDTO.js";

interface DailyCountRow {
  date: string;
  count: string;
}

export class PostgresAnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly db: IDbClient) {}

  async getTotals(businessId: string): Promise<AnalyticsTotalsDTO> {
    // Una sola ida a la base con subconsultas escalares: más simple de leer
    // que seis queries separadas y evita seis round-trips por cada carga
    // del panel.
    const result = await this.db.query<{
      conversations: string;
      messages: string;
      clients: string;
      products: string;
      services: string;
      faqs: string;
      knowledge_documents: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM conversations WHERE business_id = $1) AS conversations,
         (SELECT COUNT(*) FROM messages WHERE business_id = $1) AS messages,
         (SELECT COUNT(*) FROM clients WHERE business_id = $1 AND deleted_at IS NULL) AS clients,
         (SELECT COUNT(*) FROM products WHERE business_id = $1 AND deleted_at IS NULL) AS products,
         (SELECT COUNT(*) FROM services WHERE business_id = $1 AND deleted_at IS NULL) AS services,
         (SELECT COUNT(*) FROM faqs WHERE business_id = $1 AND deleted_at IS NULL) AS faqs,
         (SELECT COUNT(*) FROM knowledge_documents WHERE business_id = $1 AND deleted_at IS NULL) AS knowledge_documents
      `,
      [businessId],
    );
    const row = result.rows[0]!;
    return {
      conversations: Number(row.conversations),
      messages: Number(row.messages),
      clients: Number(row.clients),
      products: Number(row.products),
      services: Number(row.services),
      faqs: Number(row.faqs),
      knowledgeDocuments: Number(row.knowledge_documents),
    };
  }

  async getConversationsPerDay(businessId: string, days: number): Promise<DailyCountDTO[]> {
    return this.dailyCounts(businessId, days, "conversations");
  }

  async getMessagesPerDay(businessId: string, days: number): Promise<DailyCountDTO[]> {
    return this.dailyCounts(businessId, days, "messages");
  }

  private async dailyCounts(
    businessId: string,
    days: number,
    table: "conversations" | "messages",
  ): Promise<DailyCountDTO[]> {
    // `generate_series` + LEFT JOIN para que los días sin actividad aparezcan
    // con count 0 en vez de faltar del todo — un gráfico de línea con huecos
    // en el eje X es engañoso.
    const result = await this.db.query<DailyCountRow>(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS date, COALESCE(t.count, 0) AS count
       FROM generate_series((CURRENT_DATE - ($2::int - 1)), CURRENT_DATE, interval '1 day') AS d(day)
       LEFT JOIN (
         SELECT (created_at AT TIME ZONE 'UTC')::date AS day, COUNT(*) AS count
         FROM ${table}
         WHERE business_id = $1
         GROUP BY 1
       ) t ON t.day = d.day
       ORDER BY d.day ASC`,
      [businessId, days],
    );
    return result.rows.map((row) => ({ date: row.date, count: Number(row.count) }));
  }
}
