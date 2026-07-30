import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { RegisterUseCase } from "../application/use-cases/RegisterUseCase.js";
import type { LoginUseCase } from "../application/use-cases/LoginUseCase.js";
import type { GetCurrentUserUseCase } from "../application/use-cases/GetCurrentUserUseCase.js";

export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await this.registerUseCase.execute(req.body);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(201).json(result.value);
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await this.loginUseCase.execute(req.body);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
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
