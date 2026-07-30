import { describe, it, expect } from "vitest";
import { ClientMemory } from "@modules/memory/domain/ClientMemory.js";
import { DomainError } from "@shared/errors/AppError.js";

const businessId = "b1";
const clientId = "c1";

describe("ClientMemory", () => {
  it("creates a memory entry with trimmed content", () => {
    const result = ClientMemory.create({ businessId, clientId, content: "  Prefiere entrega por la tarde  " });

    expect(result.isSuccess).toBe(true);
    expect(result.value.content).toBe("Prefiere entrega por la tarde");
    expect(result.value.businessId).toBe(businessId);
    expect(result.value.clientId).toBe(clientId);
  });

  it("fails with a domain error for empty content", () => {
    const result = ClientMemory.create({ businessId, clientId, content: "   " });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
  });

  it("fails with a domain error for content longer than 500 characters", () => {
    const result = ClientMemory.create({ businessId, clientId, content: "a".repeat(501) });

    expect(result.isFailure).toBe(true);
    expect(result.error).toBeInstanceOf(DomainError);
  });
});
