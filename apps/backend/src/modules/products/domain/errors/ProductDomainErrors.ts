import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidProductNameError extends DomainError {
  constructor(reason: string) {
    super(`Invalid product name: ${reason}`);
  }
}

export class InvalidProductPriceError extends DomainError {
  constructor(reason: string) {
    super(`Invalid product price: ${reason}`);
  }
}
