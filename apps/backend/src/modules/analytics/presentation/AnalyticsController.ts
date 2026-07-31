import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { GetAnalyticsSummaryUseCase } from "../application/use-cases/GetAnalyticsSummaryUseCase.js";

export class AnalyticsController {
  constructor(private readonly getSummaryUseCase: GetAnalyticsSummaryUseCase) {}

  getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = req.auth?.businessId;
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.getSummaryUseCase.execute(businessId);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };
}
