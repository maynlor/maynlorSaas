import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { IFaqRepository } from "./application/repositories/IFaqRepository.js";
import { PostgresFaqRepository } from "./infrastructure/persistence/PostgresFaqRepository.js";
import { CreateFaqUseCase } from "./application/use-cases/CreateFaqUseCase.js";
import { GetFaqByIdUseCase } from "./application/use-cases/GetFaqByIdUseCase.js";
import { ListFaqsUseCase } from "./application/use-cases/ListFaqsUseCase.js";
import { UpdateFaqUseCase } from "./application/use-cases/UpdateFaqUseCase.js";
import { DeleteFaqUseCase } from "./application/use-cases/DeleteFaqUseCase.js";
import { FaqController } from "./presentation/FaqController.js";
import { buildFaqRouter } from "./presentation/faq.routes.js";

export function createKnowledgeModule(
  db: IDbClient,
  authenticate: RequestHandler,
): { router: Router; repository: IFaqRepository } {
  const repository = new PostgresFaqRepository(db);

  const createUseCase = new CreateFaqUseCase(repository);
  const getByIdUseCase = new GetFaqByIdUseCase(repository);
  const listUseCase = new ListFaqsUseCase(repository);
  const updateUseCase = new UpdateFaqUseCase(repository);
  const deleteUseCase = new DeleteFaqUseCase(repository);

  const controller = new FaqController(
    createUseCase,
    getByIdUseCase,
    listUseCase,
    updateUseCase,
    deleteUseCase,
  );

  return { router: buildFaqRouter(controller, authenticate), repository };
}
