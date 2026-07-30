import type { User } from "../../domain/User.js";

/**
 * `findByEmail` and `existsByEmail` are the ONE exception without a `businessId`
 * filter: at login time the tenant is not known yet, so the user must be
 * resolved by email alone. Every other method requires `businessId` as the
 * first parameter and filters by it, per the multi-tenant rule in CLAUDE.md.
 */
export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(businessId: string, id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
}
