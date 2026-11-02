export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'OTHER_SESSIONS_REVOKED'
  | 'ACCOUNT_DEACTIVATED'
  | 'POST_CREATED'
  | 'POST_EDITED'
  | 'POST_DELETED'
  | 'REPLY_CREATED'
  | 'REPLY_DELETED'
  | 'LIKE_CREATED'
  | 'LIKE_REMOVED'
  | 'REPOST_CREATED'
  | 'REPOST_REMOVED'
  | 'FOLLOW_CREATED'
  | 'FOLLOW_REMOVED'
  | 'NOTIFICATION_READ'
  | 'PROFILE_UPDATED'
  | 'ACCOUNT_SECURITY_UPDATED';

export type TargetType =
  | 'USER'
  | 'POST'
  | 'COMMENT'
  | 'SESSION'
  | 'NOTIFICATION'
  | 'ACCOUNT';

export interface AuditLogEntry {
  actorUserId?: string | null;
  actorUsername?: string | null;
  action: AuditAction;
  targetType?: TargetType | null;
  targetId?: string | null;
  targetUsername?: string | null;
  httpMethod?: string | null;
  route?: string | null;
  statusCode?: number | null;
  success?: boolean;
  requestId?: string | null;
  sessionId?: string | null;
  description?: string | null;
  errorCode?: string | null;
  createdAt?: Date;
}
