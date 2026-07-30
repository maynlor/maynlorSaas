import { Result } from "../../../../shared/result/Result.js";
import { InvalidMemoryContentError } from "../errors/MemoryDomainErrors.js";

const MAX_LENGTH = 500;

/** Un dato breve y útil sobre un cliente (nombre, preferencia, última compra, etc). */
export class MemoryContent {
  private constructor(private readonly value: string) {}

  static create(raw: string): Result<MemoryContent, InvalidMemoryContentError> {
    const trimmed = raw.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_LENGTH) {
      return Result.fail(
        new InvalidMemoryContentError(`must be between 1 and ${MAX_LENGTH} characters`),
      );
    }
    return Result.ok(new MemoryContent(trimmed));
  }

  toString(): string {
    return this.value;
  }
}
