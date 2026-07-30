import { DomainError } from "../../../../shared/errors/AppError.js";

export class InvalidFaqQuestionError extends DomainError {
  constructor(reason: string) {
    super(`Invalid FAQ question: ${reason}`);
  }
}

export class InvalidFaqAnswerError extends DomainError {
  constructor(reason: string) {
    super(`Invalid FAQ answer: ${reason}`);
  }
}
