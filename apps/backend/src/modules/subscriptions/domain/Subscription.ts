import { Result } from "../../../shared/result/Result.js";
import { SubscriptionAlreadyCanceledError } from "./errors/SubscriptionDomainErrors.js";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export interface SubscriptionProps {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPersistenceProps {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Subscription {
  private constructor(private props: SubscriptionProps) {}

  static create(input: {
    businessId: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }): Subscription {
    const now = new Date();
    return new Subscription({
      id: crypto.randomUUID(),
      businessId: input.businessId,
      planId: input.planId,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      canceledAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstitute(row: SubscriptionPersistenceProps): Subscription {
    return new Subscription({ ...row });
  }

  cancel(): Result<void, SubscriptionAlreadyCanceledError> {
    if (this.props.status === "canceled") {
      return Result.fail(new SubscriptionAlreadyCanceledError());
    }
    const now = new Date();
    this.props = { ...this.props, status: "canceled", canceledAt: now, updatedAt: now };
    return Result.ok(undefined);
  }

  get id(): string {
    return this.props.id;
  }

  get businessId(): string {
    return this.props.businessId;
  }

  get planId(): string {
    return this.props.planId;
  }

  get status(): SubscriptionStatus {
    return this.props.status;
  }

  get currentPeriodStart(): Date {
    return this.props.currentPeriodStart;
  }

  get currentPeriodEnd(): Date {
    return this.props.currentPeriodEnd;
  }

  get canceledAt(): Date | null {
    return this.props.canceledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isCurrent(): boolean {
    return this.props.status === "trialing" || this.props.status === "active" || this.props.status === "past_due";
  }
}
