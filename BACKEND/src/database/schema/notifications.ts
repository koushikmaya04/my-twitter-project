import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  check,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { users } from './users';
import { posts } from './posts';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),

    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    type: text('type').notNull(),

    postId: uuid('post_id').references(() => posts.id, {
      onDelete: 'cascade',
    }),

    replyId: uuid('reply_id').references(() => posts.id, {
      onDelete: 'cascade',
    }),

    dedupKey: text('dedup_key').notNull(),

    isRead: boolean('is_read').notNull().default(false),

    readAt: timestamp('read_at', {
      withTimezone: true,
      precision: 3,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('notifications_dedup_key_idx').on(table.dedupKey),

    index('notifications_recipient_created_idx').on(
      table.recipientId,
      table.createdAt.desc(),
      table.id.desc(),
    ),

    index('notifications_recipient_unread_idx').on(
      table.recipientId,
      table.isRead,
    ),

    check(
      'notifications_type_check',
      sql`${table.type} IN ('follow', 'like', 'reply', 'repost')`,
    ),

    check(
      'notifications_no_self_notification',
      sql`${table.recipientId} <> ${table.actorId}`,
    ),
  ],
);
