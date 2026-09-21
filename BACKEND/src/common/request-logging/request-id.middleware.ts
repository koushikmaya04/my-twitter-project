import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const incomingId =
      req.header('x-request-id') || req.header('X-Request-ID');
    const requestId =
      typeof incomingId === 'string' && incomingId.trim()
        ? incomingId.trim()
        : randomUUID();

    (req as Request & { requestId: string }).requestId =
      requestId;

    res.setHeader('X-Request-ID', requestId);

    next();
  }
}