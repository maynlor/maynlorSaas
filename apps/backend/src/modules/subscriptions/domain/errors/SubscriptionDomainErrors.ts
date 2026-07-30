import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidPlanNameError extends DomainError {
  constructor(reason: string) {
    super(`Invalid plan name: ${reason}`);
  }
}

export class InvalidPlanLimitError extends DomainError {
  constructor(reason: string) {
    super(`Invalid plan limit: ${reason}`);
  }
}

export class InvalidSubscriptionStatusError extends DomainError {
  constructor(reason: string) {
    super(`Invalid subscription status: ${reason}`);
  }
}

export class PlanNotActiveError extends DomainError {
  constructor(slug: string) {
    super(`Plan "${slug}" is not available for new subscriptions`);
  }
}

export class SubscriptionAlreadyCanceledError extends DomainError {
  constructor() {
    super("Subscription is already canceled");
  }
}
