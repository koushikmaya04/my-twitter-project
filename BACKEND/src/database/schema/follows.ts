import {
  pgTable,
  uuid,
  timestamp,
  index,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { users } from './users';

export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    followingId: uuid('following_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'follows_pk',
      columns: [table.followerId, table.followingId],
    }),

    index('follows_following_idx').on(table.followingId),

    check(
      'follows_no_self_follow',
      sql`${table.followerId} <> ${table.followingId}`,
    ),
  ],
);