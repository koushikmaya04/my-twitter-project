
import {
  pgTable,
  uuid,
  text,
  timestamp,
  check,
  index,
  uniqueIndex,
  foreignKey,
} from 'drizzle-orm/pg-core';



import { sql } from 'drizzle-orm';

import { users } from './users';

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey(),

    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
      }),

    kind: text('kind').notNull(),

    text: text('text'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      precision: 3,
    })
      .notNull()
      .defaultNow(),

  replyToId: uuid('reply_to_id'),

repostOfId: uuid('repost_of_id'),

  },
  (table) => [
    index('posts_feed_idx').on(
  table.createdAt.desc(),
  table.id.desc(),
),

    index('posts_author_feed_idx').on(
  table.authorId,
  table.createdAt.desc(),
  table.id.desc(),
),

   index('posts_reply_idx').on(
   table.replyToId,
   table.createdAt.desc(),
   table.id.desc(),
),
   index('posts_repost_idx').on(
    table.repostOfId,
    table.createdAt.desc(),
    table.id.desc(),
),
    foreignKey({
      columns: [table.replyToId],
      foreignColumns: [table.id],
      name: 'posts_reply_to_fk',
    }).onDelete('restrict'),

    foreignKey({
      columns: [table.repostOfId],
      foreignColumns: [table.id],
      name: 'posts_repost_of_fk',
    }).onDelete('restrict'),

    uniqueIndex('posts_unique_user_repost')
      .on(table.authorId, table.repostOfId)
      .where(sql`${table.kind} = 'repost'`),

    check(
      'posts_kind_check',
      sql`${table.kind} IN ('original', 'reply', 'repost')`,
    ),

    check(
      'posts_kind_relationship_check',
      sql`(
        (${table.kind} = 'original'
          AND ${table.replyToId} IS NULL
          AND ${table.repostOfId} IS NULL)

        OR

        (${table.kind} = 'reply'
          AND ${table.replyToId} IS NOT NULL
          AND ${table.repostOfId} IS NULL)

        OR

        (${table.kind} = 'repost'
          AND ${table.replyToId} IS NULL
          AND ${table.repostOfId} IS NOT NULL)
      )`,
    ),

    check(
      'posts_text_check',
      sql`(
        (
          ${table.kind} IN ('original', 'reply')
          AND ${table.text} IS NOT NULL
          AND ${table.text} = BTRIM(${table.text})
          AND CHAR_LENGTH(${table.text}) BETWEEN 1 AND 280
        )
        OR
        (
          ${table.kind} = 'repost'
          AND ${table.text} IS NULL
        )
      )`,
    ),
  ],
);