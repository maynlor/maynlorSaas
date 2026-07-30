import { Client } from "../../domain/Client.js";

export interface ClientRow {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class ClientFactory {
  static toDomain(row: ClientRow): Client {
    return Client.reconstitute({
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
