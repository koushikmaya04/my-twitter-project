import { Inject, Injectable } from '@nestjs/common';
import { DATABASE } from '../../database/database.provider';
import { auditLogs } from '../../database/schema';
import { AuditLogEntry } from './audit-logger.types';
import { AppStructuredLogger } from './structured-logger';

@Injectable()
export class AuditLoggerService {
  private readonly appLogger = new AppStructuredLogger(AuditLoggerService.name);

  constructor(@Inject(DATABASE) private readonly db: any) {}

  /**
   * Log a security or user action to the PostgreSQL database audit_logs table,
   * while also outputting a structured JSON log.
   *
   * Errors during logging are caught and reported via structured application log
   * without failing the parent user operation.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    const isSuccess = entry.success ?? true;

    // Structured JSON application log for Render/Cloud monitoring
    if (isSuccess) {
      this.appLogger.info(
        `[AUDIT] ${entry.action} by ${entry.actorUsername ?? 'anonymous'} on ${entry.targetType ?? 'N/A'}:${entry.targetId ?? 'N/A'}`,
        entry.requestId,
        {
          action: entry.action,
          actorUserId: entry.actorUserId ?? null,
          actorUsername: entry.actorUsername ?? null,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          statusCode: entry.statusCode ?? 200,
          success: true,
        },
      );
    } else {
      this.appLogger.warn(
        `[AUDIT_FAILED] ${entry.action} by ${entry.actorUsername ?? 'anonymous'} - ${entry.description ?? 'Operation failed'}`,
        entry.requestId,
        {
          action: entry.action,
          actorUserId: entry.actorUserId ?? null,
          actorUsername: entry.actorUsername ?? null,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          statusCode: entry.statusCode ?? 400,
          errorCode: entry.errorCode ?? null,
          success: false,
        },
      );
    }

    // Persistent storage in PostgreSQL
    try {
      if (this.db && typeof this.db.insert === 'function') {
        await this.db.insert(auditLogs).values({
          actorUserId: entry.actorUserId || null,
          actorUsername: entry.actorUsername || null,
          action: entry.action,
          targetType: entry.targetType || null,
          targetId: entry.targetId || null,
          targetUsername: entry.targetUsername || null,
          httpMethod: entry.httpMethod || null,
          route: entry.route || null,
          statusCode: entry.statusCode || null,
          success: isSuccess,
          requestId: entry.requestId || null,
          sessionId: entry.sessionId || null,
          description: entry.description || null,
          errorCode: entry.errorCode || null,
          createdAt: entry.createdAt || new Date(),
        });
      }
    } catch (err: any) {
      this.appLogger.error(
        `Failed to persist audit log entry: ${entry.action}`,
        err,
        entry.requestId,
      );
    }
  }
}
