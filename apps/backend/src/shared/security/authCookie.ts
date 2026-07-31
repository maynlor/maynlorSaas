import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "token";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthCookieSameSite = "lax" | "none" | "strict";

export interface AuthCookieConfig {
  nodeEnv: string;
  sameSite: AuthCookieSameSite;
}

/**
 * `sameSite` depende de dónde queden desplegados frontend y backend:
 *
 * - Mismo sitio registrable (`app.midominio.com` + `api.midominio.com`): `lax`.
 * - Sitios distintos (`*.onrender.com` + `*.vercel.app`, por ejemplo): hace
 *   falta `none`, porque con `lax` el navegador no envía la cookie en las
 *   peticiones del frontend y nadie puede autenticarse. Ojo: `onrender.com`
 *   está en la Public Suffix List, así que dos subdominios suyos ya cuentan
 *   como sitios distintos.
 *
 * `none` obliga a `secure`, así que fuera de producción se degrada a `lax`:
 * en desarrollo no hay HTTPS y el navegador descartaría la cookie.
 */
export function buildAuthCookieOptions(config: AuthCookieConfig): CookieOptions {
  const isProduction = config.nodeEnv === "production";
  const sameSite = config.sameSite === "none" && !isProduction ? "lax" : config.sameSite;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: "/",
    maxAge: SEVEN_DAYS_MS,
  };
}
