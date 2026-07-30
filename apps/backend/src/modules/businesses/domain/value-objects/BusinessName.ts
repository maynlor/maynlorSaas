import { Result } from "../../../../shared/result/Result.js";
import { InvalidBusinessNameError } from "../errors/BusinessDomainErrors.js";

export class BusinessName {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<BusinessName, InvalidBusinessNameError> {
    const trimmed = raw.trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      return Result.fail(
        new InvalidBusinessNameError("must be between 2 and 120 characters"),
      );
    }
    return Result.ok(new BusinessName(trimmed));
  }

  toString(): string {
    return this.value;
  }
}
