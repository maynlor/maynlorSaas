import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { ConflictError, PaymentProviderError } from "../../../../shared/errors/AppError.js";
import type { IDbClient } from "../../../../shared/database/DbClient.js";
import type { ILogger } from "../../../../shared/logger/Logger.js";
import type { IPasswordHasher } from "../../../../shared/security/PasswordHasher.js";
import type { ITokenService } from "../../../../shared/security/TokenService.js";
import { Business } from "../../../businesses/domain/Business.js";
import { BusinessMapper } from "../../../businesses/application/mappers/BusinessMapper.js";
import type { IBusinessRepository } from "../../../businesses/application/repositories/IBusinessRepository.js";
import { User } from "../../../users/domain/User.js";
import { UserMapper } from "../../../users/application/mappers/UserMapper.js";
import type { IUserRepository } from "../../../users/application/repositories/IUserRepository.js";
import type { IPlanRepository } from "../../../subscriptions/application/repositories/IPlanRepository.js";
import type { ISubscriptionRepository } from "../../../subscriptions/application/repositories/ISubscriptionRepository.js";
import type { PaymentProvider } from "../../../subscriptions/application/providers/PaymentProvider.js";
import { Subscription } from "../../../subscriptions/domain/Subscription.js";
import { Password } from "../../domain/value-objects/Password.js";
import type { RegisterInputDTO } from "../dtos/RegisterDTO.js";
import type { AuthResponseDTO } from "../dtos/AuthResponseDTO.js";

const DEFAULT_PLAN_SLUG = "starter";

export type RepositoryFactory<T> = (db: IDbClient) => T;

export class RegisterUseCase {
  constructor(
    private readonly db: IDbClient,
    private readonly createBusinessRepository: RepositoryFactory<IBusinessRepository>,
    private readonly createUserRepository: RepositoryFactory<IUserRepository>,
    private readonly createPlanRepository: RepositoryFactory<IPlanRepository>,
    private readonly createSubscriptionRepository: RepositoryFactory<ISubscriptionRepository>,
    private readonly paymentProvider: PaymentProvider,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly logger: ILogger,
  ) {}

  async execute(input: RegisterInputDTO): Promise<Result<AuthResponseDTO, AppError>> {
    const passwordResult = Password.create(input.user.password);
    if (passwordResult.isFailure) {
      return Result.fail(passwordResult.error);
    }

    const businessResult = Business.create(input.business);
    if (businessResult.isFailure) {
      return Result.fail(businessResult.error);
    }
    const business = businessResult.value;

    try {
      const { user } = await this.db.transaction(async (trx) => {
        const businessRepo = this.createBusinessRepository(trx);
        const userRepo = this.createUserRepository(trx);

        const businessExists = await businessRepo.existsByEmailOrSlug(
          business.email,
          business.slug,
        );
        if (businessExists) {
          throw new ConflictError("A business with this email or slug already exists");
        }

        const userExists = await userRepo.existsByEmail(input.user.email);
        if (userExists) {
          throw new ConflictError("A user with this email already exists");
        }

        await businessRepo.save(business);

        const passwordHash = await this.passwordHasher.hash(passwordResult.value.toString());
        const userResult = User.create({
          businessId: business.id,
          email: input.user.email,
          passwordHash,
        });
        if (userResult.isFailure) {
          throw userResult.error;
        }
        const user = userResult.value;
        await userRepo.save(user);

        await this.subscribeToDefaultPlan(trx, business.id, business.email.toString());

        return { user };
      });

      const token = this.tokenService.sign({
        sub: user.id,
        businessId: business.id,
        role: user.role,
      });

      this.logger.info("Business and owner user registered", {
        businessId: business.id,
        userId: user.id,
      });

      return Result.ok({
        token,
        user: UserMapper.toDTO(user),
        business: BusinessMapper.toDTO(business),
      });
    } catch (err) {
      if (err instanceof Error && "statusCode" in err) {
        return Result.fail(err as AppError);
      }
      throw err;
    }
  }

  private async subscribeToDefaultPlan(trx: IDbClient, businessId: string, payerEmail: string): Promise<void> {
    const planRepository = this.createPlanRepository(trx);
    const plan = await planRepository.findBySlug(DEFAULT_PLAN_SLUG);
    if (!plan) {
      this.logger.warn(`Default plan "${DEFAULT_PLAN_SLUG}" not found; business created without a subscription`, {
        businessId,
      });
      return;
    }

    let checkout;
    try {
      checkout = await this.paymentProvider.createCheckout({ businessId, plan, payerEmail });
    } catch (err) {
      throw new PaymentProviderError(
        err instanceof Error ? err.message : "The payment provider rejected the checkout request",
      );
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

    const subscriptionRepository = this.createSubscriptionRepository(trx);
    await subscriptionRepository.save(subscription);
  }
}
