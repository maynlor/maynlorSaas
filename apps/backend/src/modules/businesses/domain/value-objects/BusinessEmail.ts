import { Result } from "../../../../shared/result/Result.js";
import { InvalidBusinessEmailError } from "../errors/BusinessDomainErrors.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class BusinessEmail {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<BusinessEmail, InvalidBusinessEmailError> {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      return Result.fail(new InvalidBusinessEmailError("must be a valid email address"));
    }
    return Result.ok(new BusinessEmail(normalized));
  }

  toString(): string {
    return this.value;
  }
}
