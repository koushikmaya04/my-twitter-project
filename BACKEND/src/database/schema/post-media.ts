import {
  pgTable,
  uuid,
  integer,
  text,
  check,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { posts } from './posts';

export const postMedia = pgTable(
  'post_media',
  {
    id: uuid('id').primaryKey(),

    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, {
        onDelete: 'cascade',
      }),

    position: integer('position').notNull(),

    smallUrl: text('small_url').notNull(),

    largeUrl: text('large_url').notNull(),

    width: integer('width').notNull(),

    height: integer('height').notNull(),

    altText: text('alt_text').notNull(),
  },
  (table) => [
    unique('post_media_position_unique').on(
      table.postId,
      table.position,
    ),

    check(
      'post_media_position_check',
      sql`${table.position} BETWEEN 0 AND 3`,
    ),

    check(
      'post_media_width_check',
      sql`${table.width} > 0`,
    ),

    check(
      'post_media_height_check',
      sql`${table.height} > 0`,
    ),

    check(
      'post_media_small_url_check',
      sql`BTRIM(${table.smallUrl}) <> ''`,
    ),

    check(
      'post_media_large_url_check',
      sql`BTRIM(${table.largeUrl}) <> ''`,
    ),

    check(
      'post_media_alt_text_check',
      sql`BTRIM(${table.altText}) <> ''`,
    ),
  ],
);