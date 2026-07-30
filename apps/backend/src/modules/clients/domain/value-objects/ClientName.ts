import { Result } from "../../../../shared/result/Result.js";
import { InvalidClientNameError } from "../errors/ClientDomainErrors.js";

export class ClientName {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<ClientName, InvalidClientNameError> {
    const trimmed = raw.trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      return Result.fail(
        new InvalidClientNameError("must be between 2 and 120 characters"),
      );
    }
    return Result.ok(new ClientName(trimmed));
  }

  toString(): string {
    return this.value;
  }
}
