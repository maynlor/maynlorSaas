import type { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../../../../shared/errors/AppError.js";
import { isValidMetaSignature } from "../../infrastructure/security/verifySignature.js";

export function createVerifyMetaSignature(appSecret: string | undefined) {
  return function verifyMetaSignature(req: Request, _res: Response, next: NextFunction): void {
    if (!appSecret) {
      next();
      return;
    }

    const signature = req.headers["x-hub-signature-256"];
    if (!signature || typeof signature !== "string") {
      next(new UnauthorizedError("Missing WhatsApp webhook signature"));
      return;
    }

    const rawBody = req.rawBody ?? Buffer.from("");
    if (!isValidMetaSignature(appSecret, rawBody, signature)) {
      next(new UnauthorizedError("Invalid WhatsApp webhook signature"));
      return;
    }

    next();
  };
}
