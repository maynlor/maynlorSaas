import { Faq } from "../../domain/Faq.js";

export interface FaqRow {
  id: string;
  business_id: string;
  question: string;
  answer: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class FaqFactory {
  static toDomain(row: FaqRow): Faq {
    return Faq.reconstitute({
      id: row.id,
      businessId: row.business_id,
      question: row.question,
      answer: row.answer,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
