import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { AddClientMemoryUseCase } from "../application/use-cases/AddClientMemoryUseCase.js";
import type { ListClientMemoriesUseCase } from "../application/use-cases/ListClientMemoriesUseCase.js";
import type { DeleteClientMemoryUseCase } from "../application/use-cases/DeleteClientMemoryUseCase.js";

export class ClientMemoryController {
  constructor(
    private readonly addUseCase: AddClientMemoryUseCase,
    private readonly listUseCase: ListClientMemoriesUseCase,
    private readonly deleteUseCase: DeleteClientMemoryUseCase,
  ) {}

  private requireBusinessId(req: Request): string | null {
    return req.auth?.businessId ?? null;
  }

  add = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.addUseCase.execute(
      businessId,
      req.params.clientId as string,
      req.body,
    );
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(201).json(result.value);
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.listUseCase.execute(businessId, req.params.clientId as string);
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
