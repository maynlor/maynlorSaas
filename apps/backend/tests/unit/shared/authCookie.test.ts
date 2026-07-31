import { describe, it, expect } from "vitest";
import { buildAuthCookieOptions } from "@shared/security/authCookie.js";

describe("buildAuthCookieOptions", () => {
  it("keeps the cookie insecure in development so it works over plain HTTP", () => {
    const options = buildAuthCookieOptions({ nodeEnv: "development", sameSite: "lax" });

    expect(options.secure).toBe(false);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
  });

  it("marks the cookie secure in production", () => {
    const options = buildAuthCookieOptions({ nodeEnv: "production", sameSite: "lax" });

    expect(options.secure).toBe(true);
  });

  it("allows sameSite=none in production for a cross-site frontend", () => {
    // Con frontend y backend en sitios distintos (p. ej. *.onrender.com y
    // *.vercel.app), `lax` haría que el navegador no enviara la cookie.
    const options = buildAuthCookieOptions({ nodeEnv: "production", sameSite: "none" });

    expect(options.sameSite).toBe("none");
    expect(options.secure).toBe(true);
  });

  it("downgrades sameSite=none to lax outside production", () => {
    // `none` exige `secure`, y en desarrollo no hay HTTPS: el navegador
    // descartaría la cookie y no se podría iniciar sesión en local.
    const options = buildAuthCookieOptions({ nodeEnv: "development", sameSite: "none" });

    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(false);
  });

  it("is always httpOnly so scripts del navegador no pueden leer el token", () => {
    expect(buildAuthCookieOptions({ nodeEnv: "production", sameSite: "strict" }).httpOnly).toBe(true);
  });
});
