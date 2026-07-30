import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidClientNameError extends DomainError {
  constructor(reason: string) {
    super(`Invalid client name: ${reason}`);
  }
}
