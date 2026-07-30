import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import { PostgresClientRepository } from "./infrastructure/persistence/PostgresClientRepository.js";
import { CreateClientUseCase } from "./application/use-cases/CreateClientUseCase.js";
import { GetClientByIdUseCase } from "./application/use-cases/GetClientByIdUseCase.js";
import { ListClientsUseCase } from "./application/use-cases/ListClientsUseCase.js";
import { ClientController } from "./presentation/ClientController.js";
import { buildClientRouter } from "./presentation/client.routes.js";

export function createClientsModule(
  db: IDbClient,
  authenticate: RequestHandler,
): { router: Router } {
  const repository = new PostgresClientRepository(db);

  const createUseCase = new CreateClientUseCase(repository);
  const getByIdUseCase = new GetClientByIdUseCase(repository);
  const listUseCase = new ListClientsUseCase(repository);

  const controller = new ClientController(createUseCase, getByIdUseCase, listUseCase);

  return { router: buildClientRouter(controller, authenticate) };
}
