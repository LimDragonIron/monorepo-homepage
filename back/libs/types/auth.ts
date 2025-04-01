import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  jwtPayload?: JwtPayload;
  refreshPayload: JwtPayload;
}

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  role: string;
  sessionId: string;
  jti: string;
  iat: number;
  exp: number;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
