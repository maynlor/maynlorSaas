import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError, ValidationError } from "../../../shared/errors/AppError.js";
import type { UploadKnowledgeDocumentUseCase } from "../application/use-cases/UploadKnowledgeDocumentUseCase.js";
import type { ListKnowledgeDocumentsUseCase } from "../application/use-cases/ListKnowledgeDocumentsUseCase.js";
import type { DeleteKnowledgeDocumentUseCase } from "../application/use-cases/DeleteKnowledgeDocumentUseCase.js";
import { uploadPdfTitleSchema } from "./validation/knowledgeDocumentSchemas.js";

export class KnowledgeDocumentController {
  constructor(
    private readonly uploadUseCase: UploadKnowledgeDocumentUseCase,
    private readonly listUseCase: ListKnowledgeDocumentsUseCase,
    private readonly deleteUseCase: DeleteKnowledgeDocumentUseCase,
  ) {}

  private requireBusinessId(req: Request): string | null {
    return req.auth?.businessId ?? null;
  }

  uploadText = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.uploadUseCase.execute(businessId, {
      title: req.body.title as string,
      sourceType: "text",
      content: req.body.content as string,
    });
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(201).json(result.value);
  };

  uploadPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    if (!req.file) {
      next(new ValidationError("A PDF file is required"));
      return;
    }
    const titleResult = uploadPdfTitleSchema.safeParse(req.body);
    if (!titleResult.success) {
      next(new ValidationError("Invalid request", titleResult.error.flatten()));
      return;
    }

    const result = await this.uploadUseCase.execute(businessId, {
      title: titleResult.data.title,
      sourceType: "pdf",
      file: { buffer: req.file.buffer, filename: req.file.originalname },
    });
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
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = await this.listUseCase.execute(businessId, { page, pageSize });
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
