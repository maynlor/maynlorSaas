import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import type { ISubscriptionPaymentRepository } from "../repositories/ISubscriptionPaymentRepository.js";
import type { SubscriptionPaymentOutputDTO } from "../dtos/SubscriptionPaymentDTO.js";
import { SubscriptionPaymentMapper } from "../mappers/SubscriptionPaymentMapper.js";

const DEFAULT_LIMIT = 50;

export class ListSubscriptionPaymentsUseCase {
  constructor(private readonly paymentRepository: ISubscriptionPaymentRepository) {}

  async execute(
    businessId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<Result<{ items: SubscriptionPaymentOutputDTO[] }, AppError>> {
    const payments = await this.paymentRepository.findByBusinessId(businessId, limit);
    return Result.ok({ items: payments.map(SubscriptionPaymentMapper.toDTO) });
  }
}
