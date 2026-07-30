import { Result } from "../../../shared/result/Result.js";
import type { DomainError } from "../../../shared/errors/AppError.js";
import { PlanLimits, type PlanLimitsProps } from "./value-objects/PlanLimits.js";
import { InvalidPlanNameError } from "./errors/SubscriptionDomainErrors.js";

export interface PlanProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number | null;
  currency: string;
  limits: PlanLimits;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanPersistenceProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number | null;
  currency: string;
  limits: PlanLimitsProps;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function validateName(raw: string): Result<string, InvalidPlanNameError> {
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    return Result.fail(new InvalidPlanNameError("must be between 2 and 60 characters"));
  }
  return Result.ok(trimmed);
}

export class Plan {
  private constructor(private readonly props: PlanProps) {}

  static reconstitute(row: PlanPersistenceProps): Result<Plan, DomainError> {
    const nameResult = validateName(row.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);

    const limitsResult = PlanLimits.create(row.limits);
    if (limitsResult.isFailure) return Result.fail(limitsResult.error);

    return Result.ok(
      new Plan({
        id: row.id,
        name: nameResult.value,
        slug: row.slug,
        description: row.description,
        priceMonthly: row.priceMonthly,
        currency: row.currency,
        limits: limitsResult.value,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }),
    );
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get description(): string | null {
    return this.props.description;
  }

  get priceMonthly(): number | null {
    return this.props.priceMonthly;
  }

  get currency(): string {
    return this.props.currency;
  }

  get limits(): PlanLimits {
    return this.props.limits;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
