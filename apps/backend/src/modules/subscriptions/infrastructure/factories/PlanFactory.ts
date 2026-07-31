import { Plan } from "../../domain/Plan.js";

export interface PlanRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: string | null;
  currency: string;
  max_products: number | null;
  max_services: number | null;
  max_users: number | null;
  max_conversations_per_month: number | null;
  max_knowledge_documents: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class PlanFactory {
  static toDomain(row: PlanRow): Plan {
    const result = Plan.reconstitute({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      priceMonthly: row.price_monthly === null ? null : Number(row.price_monthly),
      currency: row.currency,
      limits: {
        maxProducts: row.max_products,
        maxServices: row.max_services,
        maxUsers: row.max_users,
        maxConversationsPerMonth: row.max_conversations_per_month,
        maxKnowledgeDocuments: row.max_knowledge_documents,
      },
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
    if (result.isFailure) {
      throw new Error(`Corrupt plan row ${row.id}: ${result.error.message}`);
    }
    return result.value;
  }
}
