import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpErrorCode, prismaErrorMapping } from '../types';
import { ResponseBuilder } from '../../common/response/response-builder';
import { sanitizeError } from '../utils';
import { Prisma } from '@prisma/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const processedError = this.processException(exception);
    const sanitizedError = sanitizeError(processedError);

    httpAdapter.reply(
      ctx.getResponse(),
      ResponseBuilder.Error(
        sanitizedError.message,
        sanitizedError.code,
        sanitizedError.meta,
      ),
      sanitizedError.statusCode,
    );
  }

  private processException(exception: unknown) {
    // Prisma 오류 처리
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapping = prismaErrorMapping[exception.code] || {
        status: 500,
        code: HttpErrorCode.DATABASE_ERROR,
      };
      return {
        ...mapping,
        message: exception.message,
        meta: exception.meta,
      };
    }

    // NestJS 기본 오류
    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        code: exception['code'] || HttpErrorCode.INTERNAL_SERVER_ERROR,
        message: exception.message,
        meta: exception['response']?.meta,
      };
    }

    // 알 수 없는 오류
    return {
      statusCode: 500,
      code: HttpErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      meta: { originalError: exception },
    };
  }
}
