import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidUserEmailError extends DomainError {
  constructor(reason: string) {
    super(`Invalid user email: ${reason}`);
  }
}
