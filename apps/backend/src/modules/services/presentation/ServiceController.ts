import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { CreateServiceUseCase } from "../application/use-cases/CreateServiceUseCase.js";
import type { GetServiceByIdUseCase } from "../application/use-cases/GetServiceByIdUseCase.js";
import type { ListServicesUseCase } from "../application/use-cases/ListServicesUseCase.js";
import type { UpdateServiceUseCase } from "../application/use-cases/UpdateServiceUseCase.js";
import type { DeleteServiceUseCase } from "../application/use-cases/DeleteServiceUseCase.js";

export class ServiceController {
  constructor(
    private readonly createUseCase: CreateServiceUseCase,
    private readonly getByIdUseCase: GetServiceByIdUseCase,
    private readonly listUseCase: ListServicesUseCase,
    private readonly updateUseCase: UpdateServiceUseCase,
    private readonly deleteUseCase: DeleteServiceUseCase,
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
