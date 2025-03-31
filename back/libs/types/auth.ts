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
  iat: number;
  exp: number;
}
