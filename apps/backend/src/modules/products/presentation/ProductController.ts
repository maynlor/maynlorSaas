import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { CreateProductUseCase } from "../application/use-cases/CreateProductUseCase.js";
import type { GetProductByIdUseCase } from "../application/use-cases/GetProductByIdUseCase.js";
import type { ListProductsUseCase } from "../application/use-cases/ListProductsUseCase.js";
import type { UpdateProductUseCase } from "../application/use-cases/UpdateProductUseCase.js";
import type { DeleteProductUseCase } from "../application/use-cases/DeleteProductUseCase.js";

export class ProductController {
  constructor(
    private readonly createUseCase: CreateProductUseCase,
    private readonly getByIdUseCase: GetProductByIdUseCase,
    private readonly listUseCase: ListProductsUseCase,
    private readonly updateUseCase: UpdateProductUseCase,
    private readonly deleteUseCase: DeleteProductUseCase,
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
