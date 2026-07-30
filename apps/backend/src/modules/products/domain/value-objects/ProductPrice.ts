import { Result } from "../../../../shared/result/Result.js";
import { InvalidProductPriceError } from "../errors/ProductDomainErrors.js";

export class ProductPrice {
  private constructor(private readonly value: number) {}

  static create(raw: number): Result<ProductPrice, InvalidProductPriceError> {
    if (!Number.isFinite(raw)) {
      return Result.fail(new InvalidProductPriceError("must be a finite number"));
    }
    if (raw < 0) {
      return Result.fail(new InvalidProductPriceError("must not be negative"));
    }
    const rounded = Math.round(raw * 100) / 100;
    return Result.ok(new ProductPrice(rounded));
  }

  toNumber(): number {
    return this.value;
  }
}
