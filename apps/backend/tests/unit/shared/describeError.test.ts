import { describe, it, expect } from "vitest";
import { describeError } from "@shared/errors/describeError.js";
import { InfrastructureError } from "@shared/errors/AppError.js";

describe("describeError", () => {
  it("keeps the provider's explanation that the domain error hides", () => {
    // Producción mostraba solo "AI provider request failed", que no distingue
    // una cuota agotada de una clave inválida.
    const cause = new Error(
      "Gemini API request failed with status 429: You exceeded your current quota",
    );
    const error = new InfrastructureError("AI provider request failed", undefined, { cause });

    const described = describeError(error);

    expect(described).toContain("AI provider request failed");
    expect(described).toContain("status 429");
    expect(described).toContain("exceeded your current quota");
  });

  it("returns a plain error unchanged", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });

  it("does not repeat a wrapper that echoes its own cause", () => {
    const cause = new Error("same message");
    const error = new InfrastructureError("same message", undefined, { cause });

    expect(describeError(error)).toBe("same message");
  });

  it("follows a chain of causes but stops before running away", () => {
    let error: unknown = new Error("root");
    for (let i = 0; i < 10; i += 1) {
      error = new InfrastructureError(`layer ${i}`, undefined, { cause: error });
    }

    const described = describeError(error);

    expect(described).toContain("layer 9");
    expect(described.split(" — caused by: ").length).toBeLessThanOrEqual(4);
  });

  it("handles values that are not Errors at all", () => {
    expect(describeError("just a string")).toBe("just a string");
    expect(describeError(null)).toBe("");
  });
});
