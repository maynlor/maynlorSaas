import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors/AppError.js";
import type { ITokenService } from "../../shared/security/TokenService.js";
import { parseCookies } from "../../shared/http/cookies.js";
import { AUTH_COOKIE_NAME } from "../../shared/security/authCookie.js";

function extractToken(req: Request): string | null {
  const cookieToken = parseCookies(req.headers.cookie)[AUTH_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }

  return null;
}

export function createAuthenticateMiddleware(tokenService: ITokenService) {
  return function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const token = extractToken(req);
    if (!token) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }

    try {
      req.auth = tokenService.verify(token);
      next();
    } catch (err) {
      next(err);
    }
  };
}
