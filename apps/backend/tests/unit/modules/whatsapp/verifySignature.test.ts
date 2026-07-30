import { describe, it, expect } from "vitest";
import {
  computeMetaSignature,
  isValidMetaSignature,
} from "@modules/whatsapp/infrastructure/security/verifySignature.js";

const appSecret = "test-app-secret";

describe("verifySignature", () => {
  it("validates a correctly computed signature", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const signature = computeMetaSignature(appSecret, body);

    expect(isValidMetaSignature(appSecret, body, signature)).toBe(true);
  });

  it("rejects a signature computed with a different secret", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    const wrongSignature = computeMetaSignature("another-secret", body);

    expect(isValidMetaSignature(appSecret, body, wrongSignature)).toBe(false);
  });

  it("rejects a signature when the body was tampered with", () => {
    const originalBody = Buffer.from(JSON.stringify({ hello: "world" }));
    const signature = computeMetaSignature(appSecret, originalBody);
    const tamperedBody = Buffer.from(JSON.stringify({ hello: "mundo" }));

    expect(isValidMetaSignature(appSecret, tamperedBody, signature)).toBe(false);
  });

  it("rejects a malformed signature without throwing", () => {
    const body = Buffer.from(JSON.stringify({ hello: "world" }));
    expect(isValidMetaSignature(appSecret, body, "not-a-real-signature")).toBe(false);
  });
});
