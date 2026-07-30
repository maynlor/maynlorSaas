import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { IProductRepository } from "./application/repositories/IProductRepository.js";
import { PostgresProductRepository } from "./infrastructure/persistence/PostgresProductRepository.js";
import { CreateProductUseCase } from "./application/use-cases/CreateProductUseCase.js";
import { GetProductByIdUseCase } from "./application/use-cases/GetProductByIdUseCase.js";
import { ListProductsUseCase } from "./application/use-cases/ListProductsUseCase.js";
import { UpdateProductUseCase } from "./application/use-cases/UpdateProductUseCase.js";
import { DeleteProductUseCase } from "./application/use-cases/DeleteProductUseCase.js";
import { ProductController } from "./presentation/ProductController.js";
import { buildProductRouter } from "./presentation/product.routes.js";

export function createProductsModule(
  db: IDbClient,
  authenticate: RequestHandler,
): { router: Router; repository: IProductRepository } {
  const repository = new PostgresProductRepository(db);

  const createUseCase = new CreateProductUseCase(repository);
  const getByIdUseCase = new GetProductByIdUseCase(repository);
  const listUseCase = new ListProductsUseCase(repository);
  const updateUseCase = new UpdateProductUseCase(repository);
  const deleteUseCase = new DeleteProductUseCase(repository);

  const controller = new ProductController(
    createUseCase,
    getByIdUseCase,
    listUseCase,
    updateUseCase,
    deleteUseCase,
  );

  return { router: buildProductRouter(controller, authenticate), repository };
}
