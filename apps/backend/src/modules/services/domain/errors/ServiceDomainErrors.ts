import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidServiceNameError extends DomainError {
  constructor(reason: string) {
    super(`Invalid service name: ${reason}`);
  }
}

export class InvalidServicePriceError extends DomainError {
  constructor(reason: string) {
    super(`Invalid service price: ${reason}`);
  }
}

export class InvalidServiceDurationError extends DomainError {
  constructor(reason: string) {
    super(`Invalid service duration: ${reason}`);
  }
}
