import { describe, it, expect } from "vitest";
import { parseCookies } from "@shared/http/cookies.js";

describe("parseCookies", () => {
  it("returns an empty object for an undefined header", () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it("parses a single cookie", () => {
    expect(parseCookies("token=abc123")).toEqual({ token: "abc123" });
  });

  it("parses multiple cookies separated by semicolons", () => {
    expect(parseCookies("token=abc123; other=xyz")).toEqual({ token: "abc123", other: "xyz" });
  });

  it("decodes URI-encoded values", () => {
    expect(parseCookies("name=hello%20world")).toEqual({ name: "hello world" });
  });

  it("ignores malformed pairs without an equals sign", () => {
    expect(parseCookies("token=abc123; malformed; other=xyz")).toEqual({
      token: "abc123",
      other: "xyz",
    });
  });
});
