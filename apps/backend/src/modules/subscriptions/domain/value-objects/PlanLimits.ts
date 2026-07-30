import { Result } from "../../../../shared/result/Result.js";
import { InvalidPlanLimitError } from "../errors/SubscriptionDomainErrors.js";

export interface PlanLimitsProps {
  maxProducts: number | null;
  maxServices: number | null;
  maxUsers: number | null;
  maxConversationsPerMonth: number | null;
}

function validateLimit(value: number | null, name: string): Result<number | null, InvalidPlanLimitError> {
  if (value === null) return Result.ok(null);
  if (!Number.isInteger(value) || value < 0) {
    return Result.fail(new InvalidPlanLimitError(`${name} must be null (unlimited) or a non-negative integer`));
  }
  return Result.ok(value);
}

/** null en cualquier límite significa "ilimitado". */
export class PlanLimits {
  private constructor(private readonly props: PlanLimitsProps) {}

  static create(input: PlanLimitsProps): Result<PlanLimits, InvalidPlanLimitError> {
    const maxProducts = validateLimit(input.maxProducts, "maxProducts");
    if (maxProducts.isFailure) return Result.fail(maxProducts.error);

    const maxServices = validateLimit(input.maxServices, "maxServices");
    if (maxServices.isFailure) return Result.fail(maxServices.error);

    const maxUsers = validateLimit(input.maxUsers, "maxUsers");
    if (maxUsers.isFailure) return Result.fail(maxUsers.error);

    const maxConversationsPerMonth = validateLimit(
      input.maxConversationsPerMonth,
      "maxConversationsPerMonth",
    );
    if (maxConversationsPerMonth.isFailure) return Result.fail(maxConversationsPerMonth.error);

    return Result.ok(
      new PlanLimits({
        maxProducts: maxProducts.value,
        maxServices: maxServices.value,
        maxUsers: maxUsers.value,
        maxConversationsPerMonth: maxConversationsPerMonth.value,
      }),
    );
  }

  get maxProducts(): number | null {
    return this.props.maxProducts;
  }

  get maxServices(): number | null {
    return this.props.maxServices;
  }

  get maxUsers(): number | null {
    return this.props.maxUsers;
  }

  get maxConversationsPerMonth(): number | null {
    return this.props.maxConversationsPerMonth;
  }

  toProps(): PlanLimitsProps {
    return { ...this.props };
  }
}
