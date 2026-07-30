import { describe, it, expect } from "vitest";
import { PromptEngine } from "@modules/ai/application/services/PromptEngine.js";

describe("PromptEngine", () => {
  it("includes the business name in the system prompt", () => {
    const prompt = PromptEngine.buildSystemPrompt("Acme");
    expect(prompt).toContain("Acme");
  });

  it("produces a non-empty prompt for any business name", () => {
    const prompt = PromptEngine.buildSystemPrompt("Zeta Corp");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("Zeta Corp");
  });
});
