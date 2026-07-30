import { User } from "../../domain/User.js";

export interface UserRow {
  id: string;
  business_id: string;
  email: string;
  password_hash: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export class UserFactory {
  static toDomain(row: UserRow): User {
    return User.reconstitute({
      id: row.id,
      businessId: row.business_id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
