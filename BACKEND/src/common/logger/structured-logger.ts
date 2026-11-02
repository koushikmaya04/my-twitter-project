export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLogPayload {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  requestId?: string | null;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
  extra?: Record<string, unknown>;
}

export class AppStructuredLogger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  private format(
    level: LogLevel,
    message: string,
    requestId?: string | null,
    error?: Error | null,
    extra?: Record<string, unknown>,
  ): string {
    const payload: StructuredLogPayload = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      requestId: requestId ?? null,
      ...(error
        ? {
            error: {
              name: error.name,
              message: error.message,
              stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
            },
          }
        : {}),
      ...(extra ? { extra } : {}),
    };

    return JSON.stringify(payload);
  }

  info(message: string, requestId?: string | null, extra?: Record<string, unknown>): void {
    console.log(this.format('INFO', message, requestId, null, extra));
  }

  warn(message: string, requestId?: string | null, extra?: Record<string, unknown>): void {
    console.warn(this.format('WARN', message, requestId, null, extra));
  }

  error(message: string, error?: Error | null, requestId?: string | null, extra?: Record<string, unknown>): void {
    console.error(this.format('ERROR', message, requestId, error, extra));
  }
}
