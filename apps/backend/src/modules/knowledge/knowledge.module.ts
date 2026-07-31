import type { Router, RequestHandler } from "express";
import type { IDbClient } from "../../shared/database/DbClient.js";
import type { IFaqRepository } from "./application/repositories/IFaqRepository.js";
import type { IDocumentChunkRepository } from "./application/repositories/IDocumentChunkRepository.js";
import type { PlanLimitReader } from "../subscriptions/application/services/PlanLimitReader.js";
import type { AIProvider } from "../ai/application/providers/AIProvider.js";
import { PostgresFaqRepository } from "./infrastructure/persistence/PostgresFaqRepository.js";
import { PostgresKnowledgeDocumentRepository } from "./infrastructure/persistence/PostgresKnowledgeDocumentRepository.js";
import { PostgresDocumentChunkRepository } from "./infrastructure/persistence/PostgresDocumentChunkRepository.js";
import { PdfParseTextExtractor } from "./infrastructure/pdf/PdfParseTextExtractor.js";
import { CreateFaqUseCase } from "./application/use-cases/CreateFaqUseCase.js";
import { GetFaqByIdUseCase } from "./application/use-cases/GetFaqByIdUseCase.js";
import { ListFaqsUseCase } from "./application/use-cases/ListFaqsUseCase.js";
import { UpdateFaqUseCase } from "./application/use-cases/UpdateFaqUseCase.js";
import { DeleteFaqUseCase } from "./application/use-cases/DeleteFaqUseCase.js";
import { UploadKnowledgeDocumentUseCase } from "./application/use-cases/UploadKnowledgeDocumentUseCase.js";
import { ListKnowledgeDocumentsUseCase } from "./application/use-cases/ListKnowledgeDocumentsUseCase.js";
import { DeleteKnowledgeDocumentUseCase } from "./application/use-cases/DeleteKnowledgeDocumentUseCase.js";
import { FaqController } from "./presentation/FaqController.js";
import { buildFaqRouter } from "./presentation/faq.routes.js";
import { KnowledgeDocumentController } from "./presentation/KnowledgeDocumentController.js";
import { buildKnowledgeDocumentRouter } from "./presentation/knowledgeDocument.routes.js";
import type { ProductTracker } from "../../shared/telemetry/ProductTracker.js";
import { NoopProductTracker } from "../../shared/telemetry/NoopProductTracker.js";

export function createKnowledgeModule(
  db: IDbClient,
  authenticate: RequestHandler,
  planLimitReader: PlanLimitReader,
  aiProvider: AIProvider,
  tracker: ProductTracker = new NoopProductTracker(),
): {
  faqRouter: Router;
  documentRouter: Router;
  faqRepository: IFaqRepository;
  documentChunkRepository: IDocumentChunkRepository;
} {
  const faqRepository = new PostgresFaqRepository(db);
  const documentRepository = new PostgresKnowledgeDocumentRepository(db);
  const documentChunkRepository = new PostgresDocumentChunkRepository(db);
  const pdfTextExtractor = new PdfParseTextExtractor();

  const createFaqUseCase = new CreateFaqUseCase(faqRepository);
  const getFaqByIdUseCase = new GetFaqByIdUseCase(faqRepository);
  const listFaqsUseCase = new ListFaqsUseCase(faqRepository);
  const updateFaqUseCase = new UpdateFaqUseCase(faqRepository);
  const deleteFaqUseCase = new DeleteFaqUseCase(faqRepository);

  const faqController = new FaqController(
    createFaqUseCase,
    getFaqByIdUseCase,
    listFaqsUseCase,
    updateFaqUseCase,
    deleteFaqUseCase,
  );

  const uploadDocumentUseCase = new UploadKnowledgeDocumentUseCase(
    documentRepository,
    documentChunkRepository,
    planLimitReader,
    aiProvider,
    pdfTextExtractor,
    tracker,
  );
  const listDocumentsUseCase = new ListKnowledgeDocumentsUseCase(documentRepository);
  const deleteDocumentUseCase = new DeleteKnowledgeDocumentUseCase(documentRepository, documentChunkRepository);

  const documentController = new KnowledgeDocumentController(
    uploadDocumentUseCase,
    listDocumentsUseCase,
    deleteDocumentUseCase,
  );

  return {
    faqRouter: buildFaqRouter(faqController, authenticate),
    documentRouter: buildKnowledgeDocumentRouter(documentController, authenticate),
    faqRepository,
    documentChunkRepository,
  };
}
