import { describe, it, expect } from "vitest";
import { redactContext } from "@shared/errors/redactContext.js";

describe("redactContext", () => {
  it("redacts secrets regardless of how the key is spelled", () => {
    const result = redactContext({
      accessToken: "EAAOh7bR6LZB...",
      WHATSAPP_APP_SECRET: "abc123",
      jwt_secret: "shhh",
      authorization: "Bearer xyz",
      apiKey: "sk-live-1",
      password: "hunter2",
      signature: "sha256=deadbeef",
    }) as Record<string, unknown>;

    for (const value of Object.values(result)) {
      expect(value).toBe("[redacted]");
    }
  });

  it("masks phone numbers, keeping enough to spot a format problem", () => {
    // El prefijo es justamente lo que permitió diagnosticar el 9 argentino, así
    // que se conserva; el abonado completo no sale del sistema.
    const result = redactContext({ to: "5491166129771" }) as Record<string, unknown>;

    expect(result["to"]).toBe("5491***71");
    expect(result["to"]).not.toContain("66129771");
  });

  it("keeps the information that makes an error diagnosable", () => {
    const result = redactContext({
      businessId: "2b875f63-ff1f-456c-8fc3-95d1fa544f1a",
      reason: "WhatsApp send text message failed with status 401: Authentication Error (code 190)",
      attempts: 3,
    }) as Record<string, unknown>;

    expect(result["businessId"]).toBe("2b875f63-ff1f-456c-8fc3-95d1fa544f1a");
    expect(result["reason"]).toContain("code 190");
    expect(result["attempts"]).toBe(3);
  });

  it("reaches secrets nested inside objects and arrays", () => {
    const result = redactContext({
      request: { headers: { authorization: "Bearer xyz" } },
      items: [{ token: "t1" }, { name: "ok" }],
    }) as Record<string, Record<string, Record<string, unknown>>>;

    expect(result["request"]?.["headers"]?.["authorization"]).toBe("[redacted]");
    const items = (result as unknown as { items: Record<string, unknown>[] }).items;
    expect(items[0]?.["token"]).toBe("[redacted]");
    expect(items[1]?.["name"]).toBe("ok");
  });

  it("does not recurse forever on a self-referencing object", () => {
    const cyclic: Record<string, unknown> = { name: "root" };
    cyclic["self"] = cyclic;

    expect(() => redactContext(cyclic)).not.toThrow();
  });

  it("leaves non-object values alone", () => {
    expect(redactContext(null)).toBe(null);
    expect(redactContext(42)).toBe(42);
    expect(redactContext("just a message")).toBe("just a message");
  });
});
