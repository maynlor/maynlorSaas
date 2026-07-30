import type { NextFunction, Request, Response } from "express";
import type { ListPlansUseCase } from "../application/use-cases/ListPlansUseCase.js";

export class PlanController {
  constructor(private readonly listUseCase: ListPlansUseCase) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plans = await this.listUseCase.execute();
      res.status(200).json({ items: plans });
    } catch (err) {
      next(err);
    }
  };
}
