import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { CreateFaqUseCase } from "../application/use-cases/CreateFaqUseCase.js";
import type { GetFaqByIdUseCase } from "../application/use-cases/GetFaqByIdUseCase.js";
import type { ListFaqsUseCase } from "../application/use-cases/ListFaqsUseCase.js";
import type { UpdateFaqUseCase } from "../application/use-cases/UpdateFaqUseCase.js";
import type { DeleteFaqUseCase } from "../application/use-cases/DeleteFaqUseCase.js";

export class FaqController {
  constructor(
    private readonly createUseCase: CreateFaqUseCase,
    private readonly getByIdUseCase: GetFaqByIdUseCase,
    private readonly listUseCase: ListFaqsUseCase,
    private readonly updateUseCase: UpdateFaqUseCase,
    private readonly deleteUseCase: DeleteFaqUseCase,
  ) {}

  private requireBusinessId(req: Request): string | null {
    return req.auth?.businessId ?? null;
  }

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.createUseCase.execute(businessId, req.body);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(201).json(result.value);
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.getByIdUseCase.execute(businessId, req.params.id as string);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await this.listUseCase.execute(businessId, { page, pageSize });
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.updateUseCase.execute(businessId, req.params.id as string, req.body);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.deleteUseCase.execute(businessId, req.params.id as string);
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(204).send();
  };
}
