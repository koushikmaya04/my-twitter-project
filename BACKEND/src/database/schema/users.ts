import {
  pgTable,
  uuid,
  text,
  timestamp,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),

    handle: text('handle').notNull(),

    displayName: text('display_name').notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('users_handle_unique').on(table.handle),

    check(
      'users_handle_normalized',
      sql`${table.handle} = LOWER(BTRIM(${table.handle}))`,
    ),

    check(
      'users_handle_nonempty',
      sql`BTRIM(${table.handle}) <> ''`,
    ),

    check(
      'users_display_name_nonempty',
      sql`BTRIM(${table.displayName}) <> ''`,
    ),
  ],
);