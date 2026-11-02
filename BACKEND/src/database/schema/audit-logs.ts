import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    actorUserId: uuid('actor_user_id')
      .references(() => users.id, { onDelete: 'set null' }),

    actorUsername: text('actor_username'),

    action: text('action').notNull(),

    targetType: text('target_type'),

    targetId: text('target_id'),

    targetUsername: text('target_username'),

    httpMethod: text('http_method'),

    route: text('route'),

    statusCode: integer('status_code'),

    success: boolean('success').notNull().default(true),

    requestId: text('request_id'),

    sessionId: text('session_id'),

    description: text('description'),

    errorCode: text('error_code'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_logs_actor_user_id_idx').on(table.actorUserId),
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_target_type_id_idx').on(table.targetType, table.targetId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ],
);
