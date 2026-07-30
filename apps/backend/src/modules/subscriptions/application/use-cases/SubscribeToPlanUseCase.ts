import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError } from "../../../../shared/errors/AppError.js";
import { PlanNotActiveError } from "../../domain/errors/SubscriptionDomainErrors.js";
import { Subscription } from "../../domain/Subscription.js";
import type { IPlanRepository } from "../repositories/IPlanRepository.js";
import type { ISubscriptionRepository } from "../repositories/ISubscriptionRepository.js";
import type { PaymentProvider } from "../providers/PaymentProvider.js";
import type { CreateSubscriptionInputDTO, SubscriptionOutputDTO } from "../dtos/SubscriptionDTO.js";
import { SubscriptionMapper } from "../mappers/SubscriptionMapper.js";

export class SubscribeToPlanUseCase {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async execute(
    businessId: string,
    input: CreateSubscriptionInputDTO,
  ): Promise<Result<SubscriptionOutputDTO, AppError>> {
    const plan = await this.planRepository.findBySlug(input.planSlug);
    if (!plan) {
      return Result.fail(new NotFoundError(`Plan "${input.planSlug}" not found`));
    }
    if (!plan.isActive) {
      return Result.fail(new PlanNotActiveError(plan.slug));
    }

    const current = await this.subscriptionRepository.findCurrentByBusinessId(businessId);
    if (current) {
      current.cancel();
      await this.subscriptionRepository.save(current);
    }

    const activation = await this.paymentProvider.activateSubscription({ businessId, plan });

    const subscription = Subscription.create({
      businessId,
      planId: plan.id,
      status: activation.status,
      currentPeriodStart: activation.currentPeriodStart,
      currentPeriodEnd: activation.currentPeriodEnd,
    });
    await this.subscriptionRepository.save(subscription);

    return Result.ok(SubscriptionMapper.toDTO(subscription, plan));
  }
}
