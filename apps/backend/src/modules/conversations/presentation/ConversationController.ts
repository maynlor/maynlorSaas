import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../shared/errors/AppError.js";
import type { SendMessageUseCase } from "../application/use-cases/SendMessageUseCase.js";
import type { ListConversationsUseCase } from "../application/use-cases/ListConversationsUseCase.js";
import type { GetConversationMessagesUseCase } from "../application/use-cases/GetConversationMessagesUseCase.js";
import type { SendManualReplyUseCase } from "../application/use-cases/SendManualReplyUseCase.js";
import type { SetBotPausedUseCase } from "../application/use-cases/SetBotPausedUseCase.js";

export class ConversationController {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly listUseCase: ListConversationsUseCase,
    private readonly getMessagesUseCase: GetConversationMessagesUseCase,
    private readonly sendManualReplyUseCase: SendManualReplyUseCase,
    private readonly setBotPausedUseCase: SetBotPausedUseCase,
  ) {}

  private requireBusinessId(req: Request): string | null {
    return req.auth?.businessId ?? null;
  }

  sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.sendMessageUseCase.execute(businessId, req.body);
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

  getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 50);
    const result = await this.getMessagesUseCase.execute(businessId, req.params.id as string, {
      page,
      pageSize,
    });
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };

  sendManualReply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.sendManualReplyUseCase.execute(
      businessId,
      req.params.id as string,
      req.body,
    );
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(201).json(result.value);
  };

  setBotPaused = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const businessId = this.requireBusinessId(req);
    if (!businessId) {
      next(new UnauthorizedError("Missing bearer token"));
      return;
    }
    const result = await this.setBotPausedUseCase.execute(
      businessId,
      req.params.id as string,
      req.body.paused as boolean,
    );
    if (result.isFailure) {
      next(result.error);
      return;
    }
    res.status(200).json(result.value);
  };
}
