import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { IServiceRepository } from "./application/repositories/IServiceRepository.js";
import { PostgresServiceRepository } from "./infrastructure/persistence/PostgresServiceRepository.js";
import { CreateServiceUseCase } from "./application/use-cases/CreateServiceUseCase.js";
import { GetServiceByIdUseCase } from "./application/use-cases/GetServiceByIdUseCase.js";
import { ListServicesUseCase } from "./application/use-cases/ListServicesUseCase.js";
import { UpdateServiceUseCase } from "./application/use-cases/UpdateServiceUseCase.js";
import { DeleteServiceUseCase } from "./application/use-cases/DeleteServiceUseCase.js";
import { ServiceController } from "./presentation/ServiceController.js";
import { buildServiceRouter } from "./presentation/service.routes.js";

export function createServicesModule(
  db: IDbClient,
  authenticate: RequestHandler,
): { router: Router; repository: IServiceRepository } {
  const repository = new PostgresServiceRepository(db);

  const createUseCase = new CreateServiceUseCase(repository);
  const getByIdUseCase = new GetServiceByIdUseCase(repository);
  const listUseCase = new ListServicesUseCase(repository);
  const updateUseCase = new UpdateServiceUseCase(repository);
  const deleteUseCase = new DeleteServiceUseCase(repository);

  const controller = new ServiceController(
    createUseCase,
    getByIdUseCase,
    listUseCase,
    updateUseCase,
    deleteUseCase,
  );

  return { router: buildServiceRouter(controller, authenticate), repository };
}
