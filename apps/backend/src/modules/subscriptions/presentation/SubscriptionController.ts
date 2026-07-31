import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { GetCurrentSubscriptionUseCase } from "../application/use-cases/GetCurrentSubscriptionUseCase.js";
import type { SubscribeToPlanUseCase } from "../application/use-cases/SubscribeToPlanUseCase.js";
import type { CancelSubscriptionUseCase } from "../application/use-cases/CancelSubscriptionUseCase.js";
import type { ListSubscriptionPaymentsUseCase } from "../application/use-cases/ListSubscriptionPaymentsUseCase.js";

export class SubscriptionController {
  constructor(
    private readonly getCurrentUseCase: GetCurrentSubscriptionUseCase,
    private readonly subscribeUseCase: SubscribeToPlanUseCase,
    private readonly cancelUseCase: CancelSubscriptionUseCase,
    private readonly listPaymentsUseCase: ListSubscriptionPaymentsUseCase,
  ) {}

  listPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.listPaymentsUseCase.execute(businessId);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };

  private requireBusinessId(req: Request): string | null {
    return req.auth?.businessId ?? null;
  }

  getCurrent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.getCurrentUseCase.execute(businessId);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };

  subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.subscribeUseCase.execute(businessId, req.body);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(201).json(result.value);
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.cancelUseCase.execute(businessId);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };
}
