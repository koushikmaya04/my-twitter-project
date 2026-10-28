import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import type { Request } from 'express';
import { Observable, map } from 'rxjs';

interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Injects the canonical `requestId` into every success
 * response body so that both success and error responses
 * carry the same request ID that appears in the
 * `X-Request-Id` response header.
 */
@Injectable()
export class RequestIdInterceptor
  implements NestInterceptor
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request =
      context.switchToHttp().getRequest<RequestWithId>();

    const requestId =
      request.requestId ?? 'unknown-request-id';

    return next.handle().pipe(
      map((data) => {
        // Only wrap plain objects — leave primitives,
        // arrays, buffers, and streams untouched.
        if (
          data !== null &&
          data !== undefined &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          !Buffer.isBuffer(data)
        ) {
          return { ...data, requestId };
        }

        return data;
      }),
    );
  }
}
