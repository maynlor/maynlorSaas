import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { CreateClientUseCase } from "../application/use-cases/CreateClientUseCase.js";
import type { GetClientByIdUseCase } from "../application/use-cases/GetClientByIdUseCase.js";
import type { ListClientsUseCase } from "../application/use-cases/ListClientsUseCase.js";

export class ClientController {
  constructor(
    private readonly createUseCase: CreateClientUseCase,
    private readonly getByIdUseCase: GetClientByIdUseCase,
    private readonly listUseCase: ListClientsUseCase,
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
}
