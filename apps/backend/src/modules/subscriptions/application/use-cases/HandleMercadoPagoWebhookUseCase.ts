import { Result } from "../../../../shared/result/Result.js";
import type { AppError } from "../../../../shared/errors/AppError.js";
import { UnauthorizedError } from "../../../../shared/errors/AppError.js";
import type { ILogger } from "../../../../shared/logger/Logger.js";
import { SubscriptionPayment } from "../../domain/SubscriptionPayment.js";
import type { ISubscriptionRepository } from "../repositories/ISubscriptionRepository.js";
import type { ISubscriptionPaymentRepository } from "../repositories/ISubscriptionPaymentRepository.js";
import type {
  PaymentProvider,
  PaymentWebhookEvent,
  SubscriptionWebhookEvent,
} from "../providers/PaymentProvider.js";

const PROVIDER = "mercadopago";

export class HandleMercadoPagoWebhookUseCase {
  constructor(
    private readonly paymentProvider: PaymentProvider,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly paymentRepository: ISubscriptionPaymentRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<Result<void, AppError>> {
    let event;
    try {
      event = await this.paymentProvider.parseWebhookEvent(rawBody, headers);
    } catch (err) {
      return Result.fail(
        new UnauthorizedError(err instanceof Error ? err.message : "Invalid Mercado Pago webhook"),
      );
    }

    if (!event) {
      return Result.ok(undefined);
    }

    if (event.kind === "subscription") {
      await this.applySubscriptionEvent(event);
    } else {
      await this.recordPayment(event);
    }
    return Result.ok(undefined);
  }

  private async applySubscriptionEvent(event: SubscriptionWebhookEvent): Promise<void> {
    const subscription = await this.subscriptionRepository.findByExternalId(PROVIDER, event.externalId);
    if (!subscription) {
      this.logger.warn("Received Mercado Pago webhook for an unknown subscription", {
        externalId: event.externalId,
      });
      return;
    }

    subscription.applyProviderUpdate({
      status: event.status,
      currentPeriodStart: event.currentPeriodStart,
      currentPeriodEnd: event.currentPeriodEnd,
    });
    await this.subscriptionRepository.save(subscription);
  }

  private async recordPayment(event: PaymentWebhookEvent): Promise<void> {
    const subscription = await this.subscriptionRepository.findByExternalId(
      PROVIDER,
      event.subscriptionExternalId,
    );
    if (!subscription) {
      this.logger.warn("Received Mercado Pago payment for an unknown subscription", {
        subscriptionExternalId: event.subscriptionExternalId,
        paymentExternalId: event.externalId,
      });
      return;
    }

    // El repositorio es idempotente por (provider, externalId): Mercado Pago
    // reintenta las notificaciones y el mismo cobro puede llegar varias veces.
    await this.paymentRepository.save(
      SubscriptionPayment.create({
        subscriptionId: subscription.id,
        businessId: subscription.businessId,
        provider: PROVIDER,
        externalId: event.externalId,
        status: event.status,
        amount: event.amount,
        currency: event.currency,
        processedAt: event.processedAt,
      }),
    );

    this.logger.info("Recorded a subscription payment", {
      businessId: subscription.businessId,
      status: event.status,
      amount: event.amount,
    });
  }
}
