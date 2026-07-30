import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidPasswordError extends DomainError {
  constructor(reason: string) {
    super(`Invalid password: ${reason}`);
  }
}
