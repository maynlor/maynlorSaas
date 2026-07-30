import { Result } from "../../../../shared/result/Result.js";
import { InvalidPasswordError } from "../errors/AuthDomainErrors.js";

export class Password {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<Password, InvalidPasswordError> {
    if (raw.length < 8 || raw.length > 72) {
      return Result.fail(
        new InvalidPasswordError("must be between 8 and 72 characters"),
      );
    }
    return Result.ok(new Password(raw));
  }

  toString(): string {
    return this.value;
  }
}
