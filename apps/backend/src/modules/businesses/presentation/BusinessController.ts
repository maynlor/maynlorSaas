import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { GetBusinessByIdUseCase } from "../application/use-cases/GetBusinessByIdUseCase.js";
import type { LinkWhatsAppNumberUseCase } from "../application/use-cases/LinkWhatsAppNumberUseCase.js";

export class BusinessController {
  constructor(
    private readonly getByIdUseCase: GetBusinessByIdUseCase,
    private readonly linkWhatsAppNumberUseCase: LinkWhatsAppNumberUseCase,
  ) {}

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.getByIdUseCase.execute(req.auth.businessId);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };

  linkWhatsApp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.linkWhatsAppNumberUseCase.execute(
      req.auth.businessId,
      req.body.phoneNumberId,
    );
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };
}
