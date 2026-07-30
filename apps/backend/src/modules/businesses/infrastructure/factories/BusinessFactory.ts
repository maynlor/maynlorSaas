import { Business } from "../../domain/Business.js";

export interface BusinessRow {
  id: string;
  name: string;
  email: string;
  slug: string;
  is_active: boolean;
  whatsapp_phone_number_id: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class BusinessFactory {
  static toDomain(row: BusinessRow): Business {
    return Business.reconstitute({
      id: row.id,
      name: row.name,
      email: row.email,
      slug: row.slug,
      isActive: row.is_active,
      whatsappPhoneNumberId: row.whatsapp_phone_number_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
