import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { NotFoundError, PaymentProviderError } from "../../../../shared/errors/AppError.js";
import { PlanNotActiveError } from "../../domain/errors/SubscriptionDomainErrors.js";
import { Subscription } from "../../domain/Subscription.js";
import type { IPlanRepository } from "../repositories/IPlanRepository.js";
import type { ISubscriptionRepository } from "../repositories/ISubscriptionRepository.js";
import type { IBusinessRepository } from "../../../businesses/application/repositories/IBusinessRepository.js";
import type { PaymentProvider } from "../providers/PaymentProvider.js";
import type { CreateSubscriptionInputDTO, SubscriptionOutputDTO } from "../dtos/SubscriptionDTO.js";
import { SubscriptionMapper } from "../mappers/SubscriptionMapper.js";

export class SubscribeToPlanUseCase {
  constructor(
    private readonly planRepository: IPlanRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly businessRepository: IBusinessRepository,
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

    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      return Result.fail(new NotFoundError("Business not found"));
    }

    // El checkout se crea antes de tocar la suscripción vigente: si el proveedor
    // falla, el negocio conserva el plan que ya tenía en vez de quedarse sin nada.
    let checkout;
    try {
      checkout = await this.paymentProvider.createCheckout({
        businessId,
        plan,
        payerEmail: business.email.toString(),
      });
    } catch (err) {
      return Result.fail(
        new PaymentProviderError(
          err instanceof Error ? err.message : "The payment provider rejected the checkout request",
        ),
      );
    }

    const current = await this.subscriptionRepository.findCurrentByBusinessId(businessId);
    if (current) {
      current.cancel();
      await this.subscriptionRepository.save(current);
    }

    const subscription = Subscription.create({
      businessId,
      planId: plan.id,
      status: checkout.status,
      provider: checkout.provider,
      externalId: checkout.externalId,
      currentPeriodStart: checkout.currentPeriodStart,
      currentPeriodEnd: checkout.currentPeriodEnd,
    });
    await this.subscriptionRepository.save(subscription);

    return Result.ok({ ...SubscriptionMapper.toDTO(subscription, plan), checkoutUrl: checkout.checkoutUrl });
  }
}
