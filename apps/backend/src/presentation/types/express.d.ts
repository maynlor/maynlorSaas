import type { AuthTokenPayload } from "../../shared/security/TokenService.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
      rawBody?: Buffer;
    }
  }
}

export {};
