import {
  pgTable,
  uuid,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';

import { users } from './users';
import { posts } from './posts';

export const likes = pgTable(
  'likes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, {
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
      name: 'likes_pk',
      columns: [table.userId, table.postId],
    }),

    index('likes_post_idx').on(table.postId),
  ],
);