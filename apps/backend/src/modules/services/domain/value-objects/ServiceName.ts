import { Result } from "../../../../shared/result/Result.js";
import { InvalidServiceNameError } from "../errors/ServiceDomainErrors.js";

export class ServiceName {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<ServiceName, InvalidServiceNameError> {
    const trimmed = raw.trim();
    if (trimmed.length < 2 || trimmed.length > 150) {
      return Result.fail(
        new InvalidServiceNameError("must be between 2 and 150 characters"),
      );
    }
    return Result.ok(new ServiceName(trimmed));
  }

  toString(): string {
    return this.value;
  }
}
