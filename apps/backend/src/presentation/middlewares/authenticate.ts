import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../shared/errors/AppError.js";
import type { ITokenService } from "../../shared/security/TokenService.js";

export function createAuthenticateMiddleware(tokenService: ITokenService) {
  return function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }

    const token = header.slice("Bearer ".length);
    try {
      req.auth = tokenService.verify(token);
      next();
    } catch (err) {
      next(err);
    }
  };
}
