
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

    // JS-P0-01: Account authentication
    passwordHash: text('password_hash'),

    // JS-P0-02: Profile fields
    bio: text('bio'),

    avatarSmallUrl: text('avatar_small_url'),

    avatarLargeUrl: text('avatar_large_url'),

    // JS-P0-02: Account deactivation
    // NULL = active; non-NULL = permanently deactivated
    deactivatedAt: timestamp('deactivated_at', {
      withTimezone: true,
      precision: 3,
    }),

    // JS-P0-02: Last profile update timestamp
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),

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
