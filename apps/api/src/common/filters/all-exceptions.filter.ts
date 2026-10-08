import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  requestId: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.id || response.getHeader('X-Request-ID') || 'unknown') as string;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        error = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body['message'] as string | string[]) || exception.message;
        error = (body['error'] as string) || exception.name;
      }
    } else if (this.isPrismaClientError(exception)) {
      // Normalize Prisma known request errors without exposing internals
      const prismaError = exception as { code?: string; message?: string };
      switch (prismaError.code) {
        case 'P2002':
          statusCode = HttpStatus.CONFLICT;
          message = 'A resource with this identifier or unique field already exists';
          error = 'Conflict';
          break;
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          message = 'The requested resource was not found';
          error = 'Not Found';
          break;
        case 'P2003':
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Related resource reference constraint failed';
          error = 'Bad Request';
          break;
        default:
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Database operation constraint violation';
          error = 'Bad Request';
          break;
      }
    } else {
      // Unhandled / system errors
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected server error occurred';
      error = 'Internal Server Error';
    }

    // Diagnostic logging on server side only (stack traces and raw exceptions stay on server)
    this.logger.error({
      message: `HTTP ${statusCode} Error on ${request.method} ${request.url}`,
      requestId,
      statusCode,
      error,
      details: exception instanceof Error ? exception.stack : exception,
    });

    const errorBody: ApiErrorResponse = {
      statusCode,
      message,
      error,
      requestId,
    };

    response.status(statusCode).json(errorBody);
  }

  private isPrismaClientError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    const name = (err as { name?: string }).constructor?.name || '';
    return name.includes('Prisma') || 'code' in err;
  }
}
