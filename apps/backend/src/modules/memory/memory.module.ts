import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { IClientMemoryRepository } from "./application/repositories/IClientMemoryRepository.js";
import { PostgresClientMemoryRepository } from "./infrastructure/persistence/PostgresClientMemoryRepository.js";
import { PostgresClientRepository } from "../clients/infrastructure/persistence/PostgresClientRepository.js";
import { AddClientMemoryUseCase } from "./application/use-cases/AddClientMemoryUseCase.js";
import { ListClientMemoriesUseCase } from "./application/use-cases/ListClientMemoriesUseCase.js";
import { DeleteClientMemoryUseCase } from "./application/use-cases/DeleteClientMemoryUseCase.js";
import { ClientMemoryController } from "./presentation/ClientMemoryController.js";
import { buildClientMemoryRouter } from "./presentation/clientMemory.routes.js";

export function createMemoryModule(
  db: IDbClient,
  authenticate: RequestHandler,
): { router: Router; repository: IClientMemoryRepository } {
  const repository = new PostgresClientMemoryRepository(db);
  const clientRepository = new PostgresClientRepository(db);

  const addUseCase = new AddClientMemoryUseCase(repository, clientRepository);
  const listUseCase = new ListClientMemoriesUseCase(repository, clientRepository);
  const deleteUseCase = new DeleteClientMemoryUseCase(repository);

  const controller = new ClientMemoryController(addUseCase, listUseCase, deleteUseCase);

  return { router: buildClientMemoryRouter(controller, authenticate), repository };
}
