import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../errors/AppError.js";
import type { AuthTokenPayload, ITokenService } from "./TokenService.js";

export class JwtTokenService implements ITokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(payload: AuthTokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    } as jwt.SignOptions);
  }

  verify(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (typeof decoded === "string") {
        throw new UnauthorizedError("Invalid token");
      }
      return {
        sub: decoded.sub as string,
        businessId: (decoded as { businessId: string }).businessId,
        role: (decoded as { role: string }).role,
      };
    } catch {
      throw new UnauthorizedError("Invalid or expired token");
    }
  }
}
