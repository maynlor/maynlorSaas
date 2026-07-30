import { Result } from "../../../../shared/result/Result.js";
import { InvalidServicePriceError } from "../errors/ServiceDomainErrors.js";

export class ServicePrice {
  private constructor(private readonly value: number) {}

  static create(raw: number): Result<ServicePrice, InvalidServicePriceError> {
    if (!Number.isFinite(raw)) {
      return Result.fail(new InvalidServicePriceError("must be a finite number"));
    }
    if (raw < 0) {
      return Result.fail(new InvalidServicePriceError("must not be negative"));
    }
    const rounded = Math.round(raw * 100) / 100;
    return Result.ok(new ServicePrice(rounded));
  }

  toNumber(): number {
    return this.value;
  }
}
