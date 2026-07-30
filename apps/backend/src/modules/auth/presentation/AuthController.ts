import type { CookieOptions, NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import { AUTH_COOKIE_NAME } from "../../../shared/security/authCookie.js";
import type { RegisterUseCase } from "../application/use-cases/RegisterUseCase.js";
import type { LoginUseCase } from "../application/use-cases/LoginUseCase.js";
import type { GetCurrentUserUseCase } from "../application/use-cases/GetCurrentUserUseCase.js";

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly cookieOptions: CookieOptions,
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await this.registerUseCase.execute(req.body);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.cookie(AUTH_COOKIE_NAME, result.value.token, this.cookieOptions);
    res.status(201).json(result.value);
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await this.loginUseCase.execute(req.body);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.cookie(AUTH_COOKIE_NAME, result.value.token, this.cookieOptions);
    res.status(200).json(result.value);
  };

  logout = (_req: Request, res: Response): void => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: this.cookieOptions.path });
    res.sendStatus(204);
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.getCurrentUserUseCase.execute(req.auth.businessId, req.auth.sub);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };
}
