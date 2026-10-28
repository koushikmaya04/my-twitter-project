import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

import { users } from './users';

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      precision: 3,
    }).notNull(),

    revokedAt: timestamp('revoked_at', {
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
    index('sessions_user_id_idx').on(table.userId),
  ],
);
