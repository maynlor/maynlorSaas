import { Result } from "../../../../shared/result/Result.js";
import { InvalidUserEmailError } from "../errors/UserDomainErrors.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UserEmail {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<UserEmail, InvalidUserEmailError> {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      return Result.fail(new InvalidUserEmailError("must be a valid email address"));
    }
    return Result.ok(new UserEmail(normalized));
  }

  toString(): string {
    return this.value;
  }
}
