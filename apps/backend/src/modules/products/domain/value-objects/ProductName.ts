import { Result } from "../../../../shared/result/Result.js";
import { InvalidProductNameError } from "../errors/ProductDomainErrors.js";

export class ProductName {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<ProductName, InvalidProductNameError> {
    const trimmed = raw.trim();
    if (trimmed.length < 2 || trimmed.length > 150) {
      return Result.fail(
        new InvalidProductNameError("must be between 2 and 150 characters"),
      );
    }
    return Result.ok(new ProductName(trimmed));
  }

  toString(): string {
    return this.value;
  }
}
