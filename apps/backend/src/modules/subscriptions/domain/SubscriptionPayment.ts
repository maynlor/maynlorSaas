import type { SubscriptionProvider } from "./Subscription.js";

/**
 * Resultado de un intento de cobro. `pending` cubre los cobros que el
 * proveedor todavía está procesando o reintentando.
 */
export type SubscriptionPaymentStatus = "approved" | "rejected" | "pending" | "refunded";

export interface SubscriptionPaymentProps {
  id: string;
  subscriptionId: string;
  businessId: string;
  provider: SubscriptionProvider;
  externalId: string;
  status: SubscriptionPaymentStatus;
  amount: number;
  currency: string;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionPaymentPersistenceProps = SubscriptionPaymentProps;

/** Un intento de cobro concreto sobre una suscripción (cargo recurrente mensual). */
export class SubscriptionPayment {
  private constructor(private readonly props: SubscriptionPaymentProps) {}

  static create(input: {
    subscriptionId: string;
    businessId: string;
    provider: SubscriptionProvider;
    externalId: string;
    status: SubscriptionPaymentStatus;
    amount: number;
    currency: string;
    processedAt: Date;
  }): SubscriptionPayment {
    const now = new Date();
    return new SubscriptionPayment({
      id: crypto.randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(row: SubscriptionPaymentPersistenceProps): SubscriptionPayment {
    return new SubscriptionPayment({ ...row });
  }

  get id(): string {
    return this.props.id;
  }

  get subscriptionId(): string {
    return this.props.subscriptionId;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get provider(): SubscriptionProvider {
    return this.props.provider;
  }

  get externalId(): string {
    return this.props.externalId;
  }

  get status(): SubscriptionPaymentStatus {
    return this.props.status;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get processedAt(): Date {
    return this.props.processedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
