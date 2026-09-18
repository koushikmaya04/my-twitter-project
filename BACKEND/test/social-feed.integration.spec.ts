import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzleSocialFeedRepository } from '../src/data/repository/drizzle-social-feed.repository';
import {
  NotFoundDomainError,
  InvalidTargetError,
  ConflictDomainError,
} from '../src/common/errors/domain-errors';
import { posts, likes } from '../src/database/schema';
import { eq, and } from 'drizzle-orm';

describe('DrizzleSocialFeedRepository PostgreSQL Integration', () => {
  let pool: Pool;
  let db: any;
  let repository: DrizzleSocialFeedRepository;

  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://postgres:admin@localhost:5432/social_feed_dev';

  // Seed constants from PRD 03 fixtures
  const ashaId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const rahulId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const postWithRepliesId = '11111111-1111-4111-8111-000000000003';

  // Track created test posts to clean up
  const createdPostIds: string[] = [];

  beforeAll(async () => {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000,
    });
    db = drizzle({ client: pool });
    repository = new DrizzleSocialFeedRepository(db);
  });

  afterAll(async () => {
    if (createdPostIds.length > 0) {
      for (const id of [...createdPostIds].reverse()) {
        await db.delete(likes).where(eq(likes.postId, id));
        await db.delete(posts).where(eq(posts.id, id));
      }
    }
    await pool.end();
  });

  describe('Read Use Cases & Cursor Pagination', () => {
    it('listOriginalFeed returns originals with batch counts and viewer state', async () => {
      const result = await repository.listOriginalFeed(null, 10, ashaId);

      expect(result.items.length).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();

      for (const item of result.items) {
        expect(item.kind).toBe('original');
        expect(typeof item.likeCount).toBe('number');
        expect(typeof item.replyCount).toBe('number');
        expect(typeof item.likedByViewer).toBe('boolean');
        expect(item.author).toBeDefined();
        expect(item.author.handle).toBeDefined();
      }
    });

    it('listOriginalFeed continues with nextCursor without duplicates', async () => {
      const page1 = await repository.listOriginalFeed(null, 5, ashaId);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await repository.listOriginalFeed(page1.nextCursor, 5, ashaId);

      const page1Ids = page1.items.map((p) => p.id);
      const page2Ids = page2.items.map((p) => p.id);

      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }
    });

    it('listReplies returns direct replies for a post', async () => {
      const result = await repository.listReplies(
        postWithRepliesId,
        null,
        10,
        ashaId,
      );

      expect(result.items.length).toBeGreaterThan(0);
      for (const reply of result.items) {
        expect(reply.kind).toBe('reply');
        expect(reply.replyToId).toBe(postWithRepliesId);
        expect(typeof reply.likeCount).toBe('number');
        expect(typeof reply.replyCount).toBe('number');
      }
    });

    it('listProfileMedia returns user media items from originals', async () => {
      const result = await repository.listProfileMedia(ashaId, null, 10);

      expect(result.items.length).toBeGreaterThan(0);
      for (const media of result.items) {
        expect(media.smallUrl).toBeDefined();
        expect(media.largeUrl).toBeDefined();
        expect(media.width).toBeGreaterThan(0);
        expect(media.height).toBeGreaterThan(0);
      }
    });

    it('searchOriginals performs case-insensitive literal search with escaping', async () => {
      const result = await repository.searchOriginals('database', null, 10, ashaId);

      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.kind).toBe('original');
        expect(item.text?.toLowerCase()).toContain('database');
      }

      // Escaping test: search with special characters should not throw SQL syntax errors
      const escapedResult = await repository.searchOriginals('%_test\\', null, 10, ashaId);
      expect(escapedResult.items).toEqual([]);
    });

    it('getUserById calculates stats with SQL count and handles non-existent users', async () => {
      const user = await repository.getUserById(ashaId);
      expect(user).not.toBeNull();
      expect(user?.handle).toBe('asha');
      expect(user?.postCount).toBeGreaterThan(0);
      expect(user?.followerCount).toBeGreaterThanOrEqual(0);
      expect(user?.followingCount).toBeGreaterThanOrEqual(0);

      const missing = await repository.getUserById('99999999-9999-4999-8999-999999999999');
      expect(missing).toBeNull();
    });
  });

  describe('Write Use Cases, Constraints & Error Mapping', () => {
    it('creates an original post successfully', async () => {
      const post = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Hello from Drizzle integration test!',
      });

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.kind).toBe('original');
      expect(post.text).toBe('Hello from Drizzle integration test!');
      expect(post.author.id).toBe(ashaId);

      createdPostIds.push(post.id);
    });

    it('creates a reply to an original post', async () => {
      const reply = await repository.createPost({
        authorId: rahulId,
        kind: 'reply',
        replyToId: postWithRepliesId,
        text: 'A valid reply from integration test',
      });

      expect(reply.kind).toBe('reply');
      expect(reply.replyToId).toBe(postWithRepliesId);
      createdPostIds.push(reply.id);
    });

    it('rejects reply when target post does not exist (404 / NotFoundDomainError)', async () => {
      await expect(
        repository.createPost({
          authorId: ashaId,
          kind: 'reply',
          replyToId: '99999999-9999-4999-8999-999999999999',
          text: 'Reply to nowhere',
        }),
      ).rejects.toThrow(NotFoundDomainError);
    });

    it('rejects reply when target is a repost (422 / InvalidTargetError)', async () => {
      // Find a seeded repost
      const [repost] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.kind, 'repost'))
        .limit(1);

      if (repost) {
        await expect(
          repository.createPost({
            authorId: ashaId,
            kind: 'reply',
            replyToId: repost.id,
            text: 'Replying to repost',
          }),
        ).rejects.toThrow(InvalidTargetError);
      }
    });

    it('creates a repost of an original post and enforces unique repost constraint', async () => {
      // Create fresh original so there are no duplicate repost collisions
      const orig = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Post to be reposted',
      });
      createdPostIds.push(orig.id);

      const repost = await repository.createPost({
        authorId: rahulId,
        kind: 'repost',
        repostOfId: orig.id,
      });

      expect(repost.kind).toBe('repost');
      expect(repost.repostOfId).toBe(orig.id);
      expect(repost.text).toBeNull();
      createdPostIds.push(repost.id);

      // Attempt duplicate repost by same author -> must fail with ConflictDomainError (409)
      await expect(
        repository.createPost({
          authorId: rahulId,
          kind: 'repost',
          repostOfId: orig.id,
        }),
      ).rejects.toThrow(ConflictDomainError);
    });

    it('rejects repost of a reply (422 / InvalidTargetError)', async () => {
      // Find a seeded reply
      const [reply] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(eq(posts.kind, 'reply'))
        .limit(1);

      if (reply) {
        await expect(
          repository.createPost({
            authorId: ashaId,
            kind: 'repost',
            repostOfId: reply.id,
          }),
        ).rejects.toThrow(InvalidTargetError);
      }
    });
  });

  describe('Likes: Idempotency, Concurrency & Atomic Operations', () => {
    let testPostId: string;

    beforeAll(async () => {
      const post = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Post for like testing',
      });
      testPostId = post.id;
      createdPostIds.push(testPostId);
    });

    it('setLike is idempotent for repeated likes and unlikes', async () => {
      // 1. Like
      const firstLike = await repository.setLike(testPostId, rahulId, true);
      expect(firstLike.likedByViewer).toBe(true);
      expect(firstLike.likeCount).toBe(1);

      // 2. Repeated like (idempotent)
      const repeatLike = await repository.setLike(testPostId, rahulId, true);
      expect(repeatLike.likedByViewer).toBe(true);
      expect(repeatLike.likeCount).toBe(1);

      // 3. Unlike
      const firstUnlike = await repository.setLike(testPostId, rahulId, false);
      expect(firstUnlike.likedByViewer).toBe(false);
      expect(firstUnlike.likeCount).toBe(0);

      // 4. Repeated unlike (idempotent)
      const repeatUnlike = await repository.setLike(testPostId, rahulId, false);
      expect(repeatUnlike.likedByViewer).toBe(false);
      expect(repeatUnlike.likeCount).toBe(0);
    });

    it('setLike throws NotFoundDomainError for non-existent post', async () => {
      await expect(
        repository.setLike('99999999-9999-4999-8999-999999999999', ashaId, true),
      ).rejects.toThrow(NotFoundDomainError);
    });

    it('handles concurrent duplicate likes across two separate PostgreSQL connections leaving exactly 1 row', async () => {
      const pool2 = new Pool({ connectionString });
      const db2 = drizzle({ client: pool2 });
      const repository2 = new DrizzleSocialFeedRepository(db2);

      try {
        // Ensure clean initial state
        await repository.setLike(testPostId, rahulId, false);

        // Run concurrent likes on two separate connections
        const [res1, res2] = await Promise.all([
          repository.setLike(testPostId, rahulId, true),
          repository2.setLike(testPostId, rahulId, true),
        ]);

        expect(res1.likedByViewer).toBe(true);
        expect(res2.likedByViewer).toBe(true);

        // Check exactly 1 row exists in likes table
        const rows = await db
          .select()
          .from(likes)
          .where(and(eq(likes.postId, testPostId), eq(likes.userId, rahulId)));

        expect(rows.length).toBe(1);
      } finally {
        await pool2.end();
      }
    });
  });

  describe('Transaction Rollback (JS-D07)', () => {
    it('rolls back completely leaving no partial rows when a transaction fails', async () => {
      const rollbackPostId = '77777777-7777-4777-8777-777777777777';

      await expect(
        db.transaction(async (tx: any) => {
          // 1. Valid write inside transaction
          await tx.insert(posts).values({
            id: rollbackPostId,
            authorId: ashaId,
            kind: 'original',
            text: 'Temporary post should be rolled back',
          });

          // 2. Deliberate failure: violation of duplicate primary key
          await tx.insert(posts).values({
            id: rollbackPostId,
            authorId: ashaId,
            kind: 'original',
            text: 'Colliding post forcing rollback',
          });
        }),
      ).rejects.toThrow();

      // Verify row does not exist after rollback
      const [persisted] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, rollbackPostId));

      expect(persisted).toBeUndefined();
    });
  });
});
