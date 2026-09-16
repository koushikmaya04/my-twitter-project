import {
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';

import type {
  NextFunction,
  Request,
  Response,
} from 'express';

interface RequestWithId extends Request {
  requestId?: string;
}

@Injectable()
export class RequestLoggingMiddleware
  implements NestMiddleware
{
  private readonly logger = new Logger(
    RequestLoggingMiddleware.name,
  );

  use(
    req: RequestWithId,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;

      this.logger.log(
        `${req.method} ${req.originalUrl} ` +
          `${res.statusCode} ${durationMs}ms ` +
          `requestId=${req.requestId ?? 'unknown'}`,
      );
    });

    next();
  }
}