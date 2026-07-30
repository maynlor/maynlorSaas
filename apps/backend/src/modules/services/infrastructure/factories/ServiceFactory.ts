import { Service } from "../../domain/Service.js";

export interface ServiceRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class ServiceFactory {
  static toDomain(row: ServiceRow): Service {
    return Service.reconstitute({
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      currency: row.currency,
      durationMinutes: row.duration_minutes,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
