import type { SubscriptionPayment } from "../../domain/SubscriptionPayment.js";
import type { SubscriptionPaymentOutputDTO } from "../dtos/SubscriptionPaymentDTO.js";

export class SubscriptionPaymentMapper {
  static toDTO(payment: SubscriptionPayment): SubscriptionPaymentOutputDTO {
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      processedAt: payment.processedAt.toISOString(),
    };
  }
}
