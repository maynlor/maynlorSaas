import type { SubscriptionPaymentStatus } from "../../domain/SubscriptionPayment.js";

export interface SubscriptionPaymentOutputDTO {
  id: string;
  status: SubscriptionPaymentStatus;
  amount: number;
  currency: string;
  processedAt: string;
}
