export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT";
  readonly statusCode = 409;
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;
}

export class DomainError extends AppError {
  readonly code = "DOMAIN_ERROR";
  readonly statusCode = 422;
}

export class InfrastructureError extends AppError {
  readonly code = "INFRASTRUCTURE_ERROR";
  readonly statusCode = 500;
}

export class PlanLimitExceededError extends AppError {
  readonly code = "PLAN_LIMIT_EXCEEDED";
  readonly statusCode = 402;
}
