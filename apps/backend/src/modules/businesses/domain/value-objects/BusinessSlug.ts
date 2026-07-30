import { Result } from "../../../../shared/result/Result.js";
import { InvalidBusinessSlugError } from "../errors/BusinessDomainErrors.js";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class BusinessSlug {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<BusinessSlug, InvalidBusinessSlugError> {
    const normalized = raw.trim().toLowerCase();
    if (normalized.length < 2 || normalized.length > 140) {
      return Result.fail(
        new InvalidBusinessSlugError("must be between 2 and 140 characters"),
      );
    }
    if (!SLUG_REGEX.test(normalized)) {
      return Result.fail(
        new InvalidBusinessSlugError("must be lowercase kebab-case (letters, numbers, hyphens)"),
      );
    }
    return Result.ok(new BusinessSlug(normalized));
  }

  toString(): string {
    return this.value;
  }
}
