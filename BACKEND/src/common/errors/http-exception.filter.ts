import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import type { Request, Response } from 'express';

interface RequestWithId extends Request {
  requestId?: string;
}

interface ErrorResponse {
  message?: string | string[];
  details?: unknown[];
}

@Catch()
export class HttpExceptionFilter
  implements ExceptionFilter
{
  catch(
    exception: unknown,
    host: ArgumentsHost,
  ) {
    const context = host.switchToHttp();

    const request =
      context.getRequest<RequestWithId>();

    const response =
      context.getResponse<Response>();

    const requestId =
      request.requestId ?? 'unknown-request-id';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse =
        exception.getResponse();

      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body =
          exceptionResponse as ErrorResponse;

        if (Array.isArray(body.message)) {
          message = body.message.join(', ');
        } else if (body.message) {
          message = body.message;
        }

        if (Array.isArray(body.details)) {
          details = body.details;
        }
      } else if (
        typeof exceptionResponse === 'string'
      ) {
        message = exceptionResponse;
      }

      if (status === HttpStatus.BAD_REQUEST) {
        code = 'VALIDATION_ERROR';
      } else if (
        status === HttpStatus.NOT_FOUND
      ) {
        code = 'NOT_FOUND';
      } else if (
        status === HttpStatus.CONFLICT
      ) {
        code = 'CONFLICT';
      } else if (
        status === HttpStatus.SERVICE_UNAVAILABLE
      ) {
        code = 'SERVICE_UNAVAILABLE';
      } else if (status >= 500) {
        code = 'INTERNAL_ERROR';
      }
    }

    response.status(status).json({
      error: {
        code,
        message,
        details,
      },
      requestId,
    });
  }
}