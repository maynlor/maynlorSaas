import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidMemoryContentError extends DomainError {
  constructor(reason: string) {
    super(`Invalid memory content: ${reason}`);
  }
}
