import { HttpException, HttpStatus } from '@nestjs/common';

export enum HttpErrorCode {
  // 400 Series
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_ID = 'INVALID_ID',
  UNIQUE_CONSTRAINT = 'UNIQUE_CONSTRAINT',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',

  // 401/403 Series
  UNAUTHORIZED = 'UNAUTHORIZED',
  RESTRICTED_RESOURCE = 'RESTRICTED_RESOURCE',

  // 500 Series
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
}

export const prismaErrorMapping: Record<
  string,
  { status: number; code: HttpErrorCode }
> = {
  P2000: { status: 400, code: HttpErrorCode.VALIDATION_ERROR },
  P2002: { status: 409, code: HttpErrorCode.UNIQUE_CONSTRAINT },
  P2025: { status: 404, code: HttpErrorCode.ACCOUNT_NOT_FOUND },
};

export class CustomHttpException extends HttpException {
  code: HttpErrorCode;

  constructor(message: string, code: HttpErrorCode) {
    super(message, HttpStatus[code.split('_').join('')] || 500);
    this.code = code;
  }
}
