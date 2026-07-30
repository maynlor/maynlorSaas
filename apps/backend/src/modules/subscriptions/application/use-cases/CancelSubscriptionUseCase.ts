import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError, InfrastructureError } from "../../../../shared/errors/AppError.js";
import type { ISubscriptionRepository } from "../repositories/ISubscriptionRepository.js";
import type { IPlanRepository } from "../repositories/IPlanRepository.js";
import type { SubscriptionOutputDTO } from "../dtos/SubscriptionDTO.js";
import { SubscriptionMapper } from "../mappers/SubscriptionMapper.js";

export class CancelSubscriptionUseCase {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly planRepository: IPlanRepository,
  ) {}

  async execute(businessId: string): Promise<Result<SubscriptionOutputDTO, AppError>> {
    const subscription = await this.subscriptionRepository.findCurrentByBusinessId(businessId);
    if (!subscription) {
      return Result.fail(new NotFoundError("This business has no active subscription"));
    }

    const cancelResult = subscription.cancel();
    if (cancelResult.isFailure) {
      return Result.fail(cancelResult.error);
    }
    await this.subscriptionRepository.save(subscription);

    const plan = await this.planRepository.findById(subscription.planId);
    if (!plan) {
      return Result.fail(new InfrastructureError("Subscribed plan no longer exists"));
    }

    return Result.ok(SubscriptionMapper.toDTO(subscription, plan));
  }
}
