import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import { PostgresBusinessRepository } from "./infrastructure/persistence/PostgresBusinessRepository.js";
import { GetBusinessByIdUseCase } from "./application/use-cases/GetBusinessByIdUseCase.js";
import { LinkWhatsAppNumberUseCase } from "./application/use-cases/LinkWhatsAppNumberUseCase.js";
import { BusinessController } from "./presentation/BusinessController.js";
import { buildBusinessRouter } from "./presentation/business.routes.js";

export function createBusinessesModule(
  db: IDbClient,
  authenticate: RequestHandler,
): { router: Router } {
  const repository = new PostgresBusinessRepository(db);
  const getByIdUseCase = new GetBusinessByIdUseCase(repository);
  const linkWhatsAppNumberUseCase = new LinkWhatsAppNumberUseCase(repository);
  const controller = new BusinessController(getByIdUseCase, linkWhatsAppNumberUseCase);

  return { router: buildBusinessRouter(controller, authenticate) };
}
