import { Result } from "../../../../shared/result/Result.js";
import { InvalidFaqQuestionError } from "../errors/FaqDomainErrors.js";

export class FaqQuestion {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<FaqQuestion, InvalidFaqQuestionError> {
    const trimmed = raw.trim();
    if (trimmed.length < 5 || trimmed.length > 300) {
      return Result.fail(
        new InvalidFaqQuestionError("must be between 5 and 300 characters"),
      );
    }
    return Result.ok(new FaqQuestion(trimmed));
  }

  toString(): string {
    return this.value;
  }
}
