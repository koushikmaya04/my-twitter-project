import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzleSocialFeedRepository } from '../src/data/repository/drizzle-social-feed.repository';
import {
  NotFoundDomainError,
  InvalidTargetError,
  ConflictDomainError,
} from '../src/common/errors/domain-errors';
import { randomUUID } from 'node:crypto';
import {
  posts,
  likes,
  users,
  postMedia,
  follows,
} from '../src/database/schema';
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
  const createdUserIds: string[] = [];

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

    for (const id of createdUserIds) {
      await db.delete(users).where(eq(users.id, id));
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
    it('listOriginalFeed supports anonymous viewers', async () => {
      const result = await repository.listOriginalFeed(null, 10, null);

      expect(result.items.length).toBeGreaterThan(0);

      for (const item of result.items) {
        expect(item.kind).toBe('original');
        expect(typeof item.likeCount).toBe('number');
        expect(item.likedByViewer).toBe(false);
      }
    });
    it('getPostById supports anonymous viewers', async () => {
      const result = await repository.getPostById(postWithRepliesId, null);

      expect(result).not.toBeNull();
      expect(result?.likedByViewer).toBe(false);
      expect(typeof result?.likeCount).toBe('number');
    });
    it('listReplies supports anonymous viewers', async () => {
      const result = await repository.listReplies(
        postWithRepliesId,
        null,
        10,
        null,
      );

      expect(result.items.length).toBeGreaterThan(0);

      for (const reply of result.items) {
        expect(reply.kind).toBe('reply');
        expect(reply.likedByViewer).toBe(false);
      }
    });

    it('returns no replies when the parent post is soft-deleted', async () => {
      const parent = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Parent post to delete',
      });
      createdPostIds.push(parent.id);

      const reply = await repository.createPost({
        authorId: rahulId,
        kind: 'reply',
        replyToId: parent.id,
        text: 'Reply under parent',
      });
      createdPostIds.push(reply.id);

      await repository.deletePost({
        postId: parent.id,
        authorId: ashaId,
      });

      const result = await repository.listReplies(parent.id, null, 10, null);

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('searchOriginals supports anonymous viewers', async () => {
      const result = await repository.searchOriginals(
        'database',
        null,
        10,
        null,
      );

      expect(result.items.length).toBeGreaterThan(0);

      for (const item of result.items) {
        expect(item.kind).toBe('original');
        expect(item.text?.toLowerCase()).toContain('database');
        expect(item.likedByViewer).toBe(false);
      }
    });

    it('listOriginalFeed continues with nextCursor without duplicates', async () => {
      const page1 = await repository.listOriginalFeed(null, 5, ashaId);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await repository.listOriginalFeed(
        page1.nextCursor,
        5,
        ashaId,
      );

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
      const result = await repository.searchOriginals(
        'database',
        null,
        10,
        ashaId,
      );

      expect(result.items.length).toBeGreaterThan(0);
      for (const item of result.items) {
        expect(item.kind).toBe('original');
        expect(item.text?.toLowerCase()).toContain('database');
      }

      // Escaping test: search with special characters should not throw SQL syntax errors
      const escapedResult = await repository.searchOriginals(
        '%_test\\',
        null,
        10,
        ashaId,
      );
      expect(escapedResult.items).toEqual([]);
    });

    it('getUserById calculates stats with SQL count and handles non-existent users', async () => {
      const user = await repository.getUserById(ashaId);
      expect(user).not.toBeNull();
      expect(user?.handle).toBe('asha');
      expect(user?.postCount).toBeGreaterThan(0);
      expect(user?.followerCount).toBeGreaterThanOrEqual(0);
      expect(user?.followingCount).toBeGreaterThanOrEqual(0);

      const missing = await repository.getUserById(
        '99999999-9999-4999-8999-999999999999',
      );
      expect(missing).toBeNull();
    });
    it('hides posts, replies, media, and profiles belonging to deactivated users', async () => {
      const userId = randomUUID();
      const originalPostId = randomUUID();
      const replyPostId = randomUUID();
      const uniqueMarker = `deactivatedvisibility${randomUUID().replace(/-/g, '')}`;

      // Track IDs before inserting so cleanup can run even after a partial failure.
      createdUserIds.push(userId);
      createdPostIds.push(originalPostId, replyPostId);

      await db.insert(users).values({
        id: userId,
        handle: `inactive_${userId.replace(/-/g, '').slice(0, 20)}`,
        displayName: 'Deactivated Test User',
        deactivatedAt: new Date(),
      });

      await db.insert(posts).values([
        {
          id: originalPostId,
          authorId: userId,
          kind: 'original',
          text: uniqueMarker,
        },
        {
          id: replyPostId,
          authorId: userId,
          kind: 'reply',
          text: uniqueMarker,
          replyToId: postWithRepliesId,
        },
      ]);

      await db.insert(postMedia).values({
        id: randomUUID(),
        postId: originalPostId,
        position: 0,
        smallUrl: 'https://example.com/test-small.jpg',
        largeUrl: 'https://example.com/test-large.jpg',
        width: 100,
        height: 100,
        altText: 'Test media',
      });

      const feed = await repository.listOriginalFeed(null, 100, null);
      const detail = await repository.getPostById(originalPostId, null);
      const replies = await repository.listReplies(
        postWithRepliesId,
        null,
        100,
        null,
      );
      const media = await repository.listProfileMedia(userId, null, 10);
      const search = await repository.searchOriginals(
        uniqueMarker,
        null,
        10,
        null,
      );
      const profile = await repository.getUserById(userId);

      expect(feed.items.some((post) => post.id === originalPostId)).toBe(false);
      expect(detail).toBeNull();
      expect(replies.items.some((reply) => reply.id === replyPostId)).toBe(
        false,
      );
      expect(media.items).toHaveLength(0);
      expect(search.items.some((post) => post.id === originalPostId)).toBe(
        false,
      );
      expect(profile).toBeNull();
    });
  });

  describe('Follows: Idempotency & Pagination', () => {
    let followerId: string;
    let targetId: string;
    let otherFollowerId: string;

    beforeAll(async () => {
      followerId = randomUUID();
      targetId = randomUUID();
      otherFollowerId = randomUUID();

      createdUserIds.push(followerId, targetId, otherFollowerId);

      await db.insert(users).values([
        {
          id: followerId,
          handle: `follower_${followerId.replace(/-/g, '').slice(0, 20)}`,
          displayName: 'Integration Follower',
        },
        {
          id: targetId,
          handle: `target_${targetId.replace(/-/g, '').slice(0, 20)}`,
          displayName: 'Integration Target',
        },
        {
          id: otherFollowerId,
          handle: `other_${otherFollowerId.replace(/-/g, '').slice(0, 20)}`,
          displayName: 'Integration Other Follower',
        },
      ]);
    });

    it('makes follow and unfollow idempotent and returns accurate counts', async () => {
      const firstFollow = await repository.setFollow(
        followerId,
        targetId,
        true,
      );

      expect(firstFollow).toEqual({
        following: true,
        followerCount: 1,
        followingCount: 1,
      });

      const repeatedFollow = await repository.setFollow(
        followerId,
        targetId,
        true,
      );

      expect(repeatedFollow).toEqual(firstFollow);
      expect(await repository.isFollowing(followerId, targetId)).toBe(true);

      const firstUnfollow = await repository.setFollow(
        followerId,
        targetId,
        false,
      );

      expect(firstUnfollow).toEqual({
        following: false,
        followerCount: 0,
        followingCount: 0,
      });

      const repeatedUnfollow = await repository.setFollow(
        followerId,
        targetId,
        false,
      );

      expect(repeatedUnfollow).toEqual(firstUnfollow);
      expect(await repository.isFollowing(followerId, targetId)).toBe(false);
    });

    it('rejects self-follow', async () => {
      await expect(
        repository.setFollow(followerId, followerId, true),
      ).rejects.toBeInstanceOf(InvalidTargetError);
    });

    it('paginates followers without duplicates across consecutive pages', async () => {
      await repository.setFollow(followerId, targetId, true);
      await repository.setFollow(otherFollowerId, targetId, true);

      const firstPage = await repository.listFollowers(targetId, null, 1);

      expect(firstPage.items).toHaveLength(1);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).not.toBeNull();

      const secondPage = await repository.listFollowers(
        targetId,
        firstPage.nextCursor,
        1,
      );

      expect(secondPage.items).toHaveLength(1);
      expect(secondPage.hasMore).toBe(false);
      expect(secondPage.nextCursor).toBeNull();

      expect(firstPage.items[0].id).not.toBe(secondPage.items[0].id);
      expect(
        new Set([firstPage.items[0].id, secondPage.items[0].id]).size,
      ).toBe(2);
    });

    it('excludes deactivated accounts from follower and following lists', async () => {
      const inactiveId = randomUUID();

      createdUserIds.push(inactiveId);

      await db.insert(users).values({
        id: inactiveId,
        handle: `inactive_${inactiveId.replace(/-/g, '').slice(0, 20)}`,
        displayName: 'Inactive Follower',
        deactivatedAt: new Date(),
      });

      await repository.setFollow(followerId, targetId, true);

      // The inactive account can have an existing relationship in the database.
      await db.insert(follows).values({
        followerId: inactiveId,
        followingId: targetId,
      });
      const followers = await repository.listFollowers(targetId, null, 10);

      expect(followers.items.some((user) => user.id === inactiveId)).toBe(
        false,
      );

      await expect(
        repository.listFollowing(inactiveId, null, 10),
      ).rejects.toBeInstanceOf(NotFoundDomainError);
    });

    it('excludes deactivated accounts from profile follower and following counts', async () => {
      const activeFollowerId = randomUUID();
      const activeTargetId = randomUUID();
      const inactiveId = randomUUID();

      createdUserIds.push(activeFollowerId, activeTargetId, inactiveId);

      await db.insert(users).values([
        {
          id: activeFollowerId,
          handle: `active_follower_${activeFollowerId.replace(/-/g, '').slice(0, 16)}`,
          displayName: 'Active Follower',
        },
        {
          id: activeTargetId,
          handle: `active_target_${activeTargetId.replace(/-/g, '').slice(0, 16)}`,
          displayName: 'Active Target',
        },
        {
          id: inactiveId,
          handle: `inactive_${inactiveId.replace(/-/g, '').slice(0, 20)}`,
          displayName: 'Inactive Account',
          deactivatedAt: new Date(),
        },
      ]);

      // One valid relationship.
      await db.insert(follows).values({
        followerId: activeFollowerId,
        followingId: activeTargetId,
      });

      // Existing relationships involving the deactivated account.
      await db.insert(follows).values([
        {
          followerId: inactiveId,
          followingId: activeTargetId,
        },
        {
          followerId: activeFollowerId,
          followingId: inactiveId,
        },
      ]);

      const target = await repository.getUserById(activeTargetId);
      const follower = await repository.getUserById(activeFollowerId);

      expect(target).not.toBeNull();
      expect(target?.followerCount).toBe(1);

      expect(follower).not.toBeNull();
      expect(follower?.followingCount).toBe(1);
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

    it('updates an owned post and increments its version', async () => {
      const created = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Original lifecycle text',
      });
      createdPostIds.push(created.id);

      const updated = await repository.updatePost({
        postId: created.id,
        authorId: ashaId,
        text: 'Updated lifecycle text',
        expectedVersion: 1,
      });

      expect(updated.status).toBe('updated');

      if (updated.status === 'updated') {
        expect(updated.post.text).toBe('Updated lifecycle text');
        expect(updated.post.version).toBe(2);
        expect(updated.post.isEdited).toBe(true);
        expect(updated.post.editedAt).not.toBeNull();
      }
    });

    it('rejects a stale post version', async () => {
      const created = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Version conflict test',
      });
      createdPostIds.push(created.id);

      await repository.updatePost({
        postId: created.id,
        authorId: ashaId,
        text: 'First update',
        expectedVersion: 1,
      });

      const staleUpdate = await repository.updatePost({
        postId: created.id,
        authorId: ashaId,
        text: 'Stale update',
        expectedVersion: 1,
      });

      expect(staleUpdate.status).toBe('conflict');
    });

    it('soft-deletes an owned post and hides it from reads', async () => {
      const created = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Post to soft-delete',
      });
      createdPostIds.push(created.id);

      const deletion = await repository.deletePost({
        postId: created.id,
        authorId: ashaId,
      });

      expect(deletion.status).toBe('deleted');

      const detail = await repository.getPostById(created.id, null);
      expect(detail).toBeNull();

      const repeatedDeletion = await repository.deletePost({
        postId: created.id,
        authorId: ashaId,
      });
      expect(repeatedDeletion.status).toBe('deleted');
    });

    it('excludes soft-deleted original posts from profile post counts', async () => {
      const created = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Profile count soft-delete regression test',
      });
      createdPostIds.push(created.id);

      const profileBeforeDelete = await repository.getUserById(ashaId);
      expect(profileBeforeDelete).not.toBeNull();

      const countBeforeDelete = profileBeforeDelete!.postCount;

      expect(countBeforeDelete).toBeGreaterThan(0);

      const deletion = await repository.deletePost({
        postId: created.id,
        authorId: ashaId,
      });

      expect(deletion.status).toBe('deleted');

      const profileAfterDelete = await repository.getUserById(ashaId);
      expect(profileAfterDelete).not.toBeNull();
      expect(profileAfterDelete!.postCount).toBe(countBeforeDelete - 1);
    });

    it('rejects editing another user’s post', async () => {
      const created = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Ownership test',
      });
      createdPostIds.push(created.id);

      const result = await repository.updatePost({
        postId: created.id,
        authorId: rahulId,
        text: 'Unauthorized change',
        expectedVersion: 1,
      });

      expect(result.status).toBe('forbidden');

      const unchanged = await repository.getPostById(created.id, null);
      expect(unchanged?.text).toBe('Ownership test');
      expect(unchanged?.version).toBe(1);
    });

    it('rejects editing a post outside the 30-minute window', async () => {
      const created = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Expired edit window test',
      });
      createdPostIds.push(created.id);

      // Backdate the post beyond the permitted editing window.
      await db
        .update(posts)
        .set({ createdAt: new Date(Date.now() - 31 * 60 * 1000) })
        .where(eq(posts.id, created.id));

      const result = await repository.updatePost({
        postId: created.id,
        authorId: ashaId,
        text: 'Too late to edit',
        expectedVersion: 1,
      });

      expect(result.status).toBe('edit_window_expired');
    });

    it('prevents another user from deleting a post', async () => {
      const created = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Delete ownership test',
      });
      createdPostIds.push(created.id);

      const result = await repository.deletePost({
        postId: created.id,
        authorId: rahulId,
      });

      expect(result.status).toBe('forbidden');

      const stillVisible = await repository.getPostById(created.id, null);
      expect(stillVisible).not.toBeNull();
    });

    it('rejects likes on a soft-deleted post', async () => {
      const created = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Deleted post like test',
      });
      createdPostIds.push(created.id);

      await repository.deletePost({
        postId: created.id,
        authorId: ashaId,
      });

      await expect(
        repository.setLike(created.id, rahulId, true),
      ).rejects.toThrow(NotFoundDomainError);
    });

    it('rejects a reply to a soft-deleted post', async () => {
      const target = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Deleted reply target',
      });
      createdPostIds.push(target.id);

      await repository.deletePost({
        postId: target.id,
        authorId: ashaId,
      });

      await expect(
        repository.createPost({
          authorId: rahulId,
          kind: 'reply',
          replyToId: target.id,
          text: 'Reply to deleted post',
        }),
      ).rejects.toThrow(NotFoundDomainError);
    });

    it('rejects a repost of a soft-deleted post', async () => {
      const target = await repository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Deleted repost target',
      });
      createdPostIds.push(target.id);

      await repository.deletePost({
        postId: target.id,
        authorId: ashaId,
      });

      await expect(
        repository.createPost({
          authorId: rahulId,
          kind: 'repost',
          repostOfId: target.id,
        }),
      ).rejects.toThrow(NotFoundDomainError);
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
        repository.setLike(
          '99999999-9999-4999-8999-999999999999',
          ashaId,
          true,
        ),
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
