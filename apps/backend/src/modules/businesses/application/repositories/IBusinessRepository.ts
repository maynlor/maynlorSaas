import type { Business } from "../../domain/Business.js";

/**
 * `businesses` is the tenant root — it has no `business_id` of its own, so this
 * interface is the ONE exception in the codebase without a tenant filter.
 * Every other module's repository interface must require `businessId` as the
 * first parameter on each method and filter all queries by it.
 */
export interface IBusinessRepository {
  save(business: Business): Promise<void>;
  findById(id: string): Promise<Business | null>;
  findBySlug(slug: string): Promise<Business | null>;
  findByWhatsAppPhoneNumberId(phoneNumberId: string): Promise<Business | null>;
  findAll(pagination: { limit: number; offset: number }): Promise<{
    items: Business[];
    total: number;
  }>;
  existsByEmailOrSlug(email: string, slug: string): Promise<boolean>;
}
