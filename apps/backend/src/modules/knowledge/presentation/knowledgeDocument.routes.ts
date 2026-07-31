import { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import type { KnowledgeDocumentController } from "./KnowledgeDocumentController.js";
import { validate } from "../../../presentation/middlewares/validate.js";
import { pdfUpload } from "./middlewares/pdfUpload.js";
import { ValidationError } from "../../../shared/errors/AppError.js";
import {
  uploadTextKnowledgeDocumentSchema,
  listKnowledgeDocumentsSchema,
  deleteKnowledgeDocumentSchema,
} from "./validation/knowledgeDocumentSchemas.js";

/** multer reporta límite de tamaño / tipo de archivo inválido como un Error crudo; lo mapeamos a un 400 en vez de dejar que caiga como 500. */
function handlePdfUpload(req: Request, res: Response, next: NextFunction): void {
  pdfUpload.single("file")(req, res, (err: unknown) => {
    if (err) {
      next(new ValidationError(err instanceof Error ? err.message : "Invalid file upload"));
      return;
    }
    next();
  });
}

export function buildKnowledgeDocumentRouter(
  controller: KnowledgeDocumentController,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.use(authenticate);
  router.post("/", validate(uploadTextKnowledgeDocumentSchema), controller.uploadText);
  router.post("/upload", handlePdfUpload, controller.uploadPdf);
  router.get("/", validate(listKnowledgeDocumentsSchema), controller.list);
  router.delete("/:id", validate(deleteKnowledgeDocumentSchema), controller.delete);

  return router;
}
