export interface AuthTokenPayload {
  sub: string;
  businessId: string;
  role: string;
}

export interface ITokenService {
  sign(payload: AuthTokenPayload): string;
  verify(token: string): AuthTokenPayload;
}
