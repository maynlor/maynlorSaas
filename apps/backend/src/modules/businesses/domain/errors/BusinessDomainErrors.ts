import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidBusinessNameError extends DomainError {
  constructor(reason: string) {
    super(`Invalid business name: ${reason}`);
  }
}

export class InvalidBusinessEmailError extends DomainError {
  constructor(reason: string) {
    super(`Invalid business email: ${reason}`);
  }
}

export class InvalidBusinessSlugError extends DomainError {
  constructor(reason: string) {
    super(`Invalid business slug: ${reason}`);
  }
}
