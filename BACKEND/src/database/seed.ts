import 'dotenv/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import {
  follows,
  likes,
  postMedia,
  posts,
  users,
} from './schema';

import {
  users as fixtureUsers,
  posts as fixturePosts,
  media as fixtureMedia,
  likes as fixtureLikes,
  follows as fixtureFollows,
} from '../data/fixtures/fixture-data';

async function seed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString,
  });

  const db = drizzle({ client: pool });

  try {
    console.log('Seeding database...');

    await db.delete(likes);
    await db.delete(postMedia);
    await db.delete(follows);
    await db.delete(posts);
    await db.delete(users);

    await db.insert(users).values(
      fixtureUsers.map((user) => ({
        id: user.id,
        handle: user.handle,
        displayName: user.displayName,
      })),
    );

    await db.insert(posts).values(
      fixturePosts.map((post) => ({
        id: post.id,
        authorId: post.authorId,
        kind: post.kind,
        text: post.text,
        createdAt: new Date(post.createdAt),
        replyToId: post.replyToId,
        repostOfId: post.repostOfId,
      })),
    );

    await db.insert(postMedia).values(
      fixtureMedia.map((item) => ({
        id: item.id,
        postId: item.postId,
        position: item.position,
        smallUrl: item.smallUrl,
        largeUrl: item.largeUrl,
        width: item.width,
        height: item.height,
        altText: item.altText,
      })),
    );

    await db.insert(likes).values(
      fixtureLikes.map((like) => ({
        userId: like.userId,
        postId: like.postId,
      })),
    );

    await db.insert(follows).values(
      fixtureFollows.map((follow) => ({
        followerId: follow.followerId,
        followingId: follow.followingId,
      })),
    );

    console.log('Database seeded successfully.');
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});