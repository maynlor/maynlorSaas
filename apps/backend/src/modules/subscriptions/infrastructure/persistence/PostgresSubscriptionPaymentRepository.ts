import type { IDbClient } from "../../../../shared/database/DbClient.js";
import type { SubscriptionPayment } from "../../domain/SubscriptionPayment.js";
import type { ISubscriptionPaymentRepository } from "../../application/repositories/ISubscriptionPaymentRepository.js";
import {
  SubscriptionPaymentFactory,
  type SubscriptionPaymentRow,
} from "../factories/SubscriptionPaymentFactory.js";

export class PostgresSubscriptionPaymentRepository implements ISubscriptionPaymentRepository {
  constructor(private readonly db: IDbClient) {}

  async save(payment: SubscriptionPayment): Promise<void> {
    // El conflicto se resuelve sobre (provider, external_id), no sobre el id
    // propio: un webhook reintentado trae el mismo cobro del proveedor pero
    // generaría un UUID nuevo de nuestro lado.
    await this.db.query(
      `INSERT INTO subscription_payments (id, subscription_id, business_id, provider, external_id, status, amount, currency, processed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (provider, external_id) DO UPDATE SET
         status = EXCLUDED.status,
         amount = EXCLUDED.amount,
         currency = EXCLUDED.currency,
         processed_at = EXCLUDED.processed_at,
         updated_at = EXCLUDED.updated_at`,
      [
        payment.id,
        payment.subscriptionId,
        payment.businessId,
        payment.provider,
        payment.externalId,
        payment.status,
        payment.amount,
        payment.currency,
        payment.processedAt,
        payment.createdAt,
        payment.updatedAt,
      ],
    );
  }

  async findByBusinessId(businessId: string, limit: number): Promise<SubscriptionPayment[]> {
    const result = await this.db.query<SubscriptionPaymentRow>(
      `SELECT * FROM subscription_payments
       WHERE business_id = $1
       ORDER BY processed_at DESC
       LIMIT $2`,
      [businessId, limit],
    );
    return result.rows.map(SubscriptionPaymentFactory.toDomain);
  }
}
