import type { IDbClient } from "../../../../shared/database/DbClient.js";
import { User } from "../../domain/User.js";
import type { IUserRepository } from "../../application/repositories/IUserRepository.js";
import { UserFactory, type UserRow } from "../factories/UserFactory.js";

export class PostgresUserRepository implements IUserRepository {
  constructor(private readonly db: IDbClient) {}

  async save(user: User): Promise<void> {
    await this.db.query(
      `INSERT INTO users (id, business_id, email, password_hash, role, is_active, created_at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         is_active = EXCLUDED.is_active,
         updated_at = EXCLUDED.updated_at,
         deleted_at = EXCLUDED.deleted_at`,
      [
        user.id,
        user.businessId,
        user.email,
        user.passwordHash,
        user.role,
        user.isActive,
        user.createdAt,
        user.updatedAt,
        user.isDeleted ? new Date() : null,
      ],
    );
  }

  async findById(businessId: string, id: string): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      `SELECT * FROM users WHERE id = $1 AND business_id = $2 AND deleted_at IS NULL`,
      [id, businessId],
    );
    const row = result.rows[0];
    return row ? UserFactory.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );
    const row = result.rows[0];
    return row ? UserFactory.toDomain(row) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [email],
    );
    return result.rowCount > 0;
  }
}
