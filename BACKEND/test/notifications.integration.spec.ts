import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

import { DrizzleSocialFeedRepository } from '../src/data/repository/drizzle-social-feed.repository';
import { NotificationsService } from '../src/notifications/notifications.service';
import {
  follows,
  likes,
  notifications,
  posts,
  users,
} from '../src/database/schema';

describe('Notifications PostgreSQL Integration', () => {
  let pool: Pool;
  let db: any;
  let feedRepository: DrizzleSocialFeedRepository;
  let notificationsService: NotificationsService;

  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://postgres:admin@localhost:5432/social_feed_dev';

  // Seed user IDs from fixtures
  const ashaId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const rahulId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  // Transient test IDs to clean up
  const createdNotificationIds: string[] = [];
  const createdPostIds: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000,
    });
    db = drizzle({ client: pool });
    feedRepository = new DrizzleSocialFeedRepository(db);
    notificationsService = new NotificationsService(db);
  });

  afterAll(async () => {
    // Clean up created notifications
    if (createdNotificationIds.length > 0) {
      for (const id of createdNotificationIds) {
        await db.delete(notifications).where(eq(notifications.id, id));
      }
    }

    // Clean up created posts
    if (createdPostIds.length > 0) {
      for (const id of [...createdPostIds].reverse()) {
        await db.delete(notifications).where(eq(notifications.postId, id));
        await db.delete(notifications).where(eq(notifications.replyId, id));
        await db.delete(likes).where(eq(likes.postId, id));
        await db.delete(posts).where(eq(posts.id, id));
      }
    }

    // Clean up transient users
    for (const id of createdUserIds) {
      await db.delete(notifications).where(eq(notifications.recipientId, id));
      await db.delete(notifications).where(eq(notifications.actorId, id));
      await db.delete(follows).where(eq(follows.followerId, id));
      await db.delete(follows).where(eq(follows.followingId, id));
      await db.delete(users).where(eq(users.id, id));
    }

    await pool.end();
  });

  describe('Notification Creation from Source Actions', () => {
    it('creates one notification for the followed user upon follow', async () => {
      // Ensure initial clean state
      await feedRepository.setFollow(rahulId, ashaId, false);
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, rahulId),
            eq(notifications.type, 'follow'),
          ),
        );

      const followResult = await feedRepository.setFollow(
        rahulId,
        ashaId,
        true,
      );
      expect(followResult.following).toBe(true);

      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, rahulId),
            eq(notifications.type, 'follow'),
          ),
        );

      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe('follow');
      expect(notifs[0].isRead).toBe(false);
      createdNotificationIds.push(notifs[0].id);
    });

    it('repeated follow does not create duplicate notifications', async () => {
      // Repeat follow
      await feedRepository.setFollow(rahulId, ashaId, true);

      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, rahulId),
            eq(notifications.type, 'follow'),
          ),
        );

      expect(notifs).toHaveLength(1);
    });

    it('creates one notification for the post author upon like', async () => {
      // Create a post by Asha
      const post = await feedRepository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Asha test post for likes',
      });
      createdPostIds.push(post.id);

      // Rahul likes Asha's post
      const likeResult = await feedRepository.setLike(post.id, rahulId, true);
      expect(likeResult.likedByViewer).toBe(true);

      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, rahulId),
            eq(notifications.postId, post.id),
            eq(notifications.type, 'like'),
          ),
        );

      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe('like');
      expect(notifs[0].isRead).toBe(false);
      createdNotificationIds.push(notifs[0].id);
    });

    it('self-like creates no notification', async () => {
      const post = await feedRepository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Asha test post for self-like',
      });
      createdPostIds.push(post.id);

      // Asha likes her own post
      await feedRepository.setLike(post.id, ashaId, true);

      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, ashaId),
            eq(notifications.postId, post.id),
          ),
        );

      expect(notifs).toHaveLength(0);
    });

    it('creates one notification for parent post author upon direct reply', async () => {
      const originalPost = await feedRepository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Asha post to be replied to',
      });
      createdPostIds.push(originalPost.id);

      // Rahul replies to Asha's post
      const replyPost = await feedRepository.createPost({
        authorId: rahulId,
        kind: 'reply',
        replyToId: originalPost.id,
        text: 'Rahul direct reply',
      });
      createdPostIds.push(replyPost.id);

      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, rahulId),
            eq(notifications.postId, originalPost.id),
            eq(notifications.replyId, replyPost.id),
            eq(notifications.type, 'reply'),
          ),
        );

      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe('reply');
      createdNotificationIds.push(notifs[0].id);
    });

    it('self-reply creates no notification', async () => {
      const originalPost = await feedRepository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Asha original post for self-reply',
      });
      createdPostIds.push(originalPost.id);

      // Asha replies to her own post
      const selfReply = await feedRepository.createPost({
        authorId: ashaId,
        kind: 'reply',
        replyToId: originalPost.id,
        text: 'Asha replies to herself',
      });
      createdPostIds.push(selfReply.id);

      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, ashaId),
            eq(notifications.replyId, selfReply.id),
          ),
        );

      expect(notifs).toHaveLength(0);
    });

    it('creates one notification for original post author upon repost', async () => {
      const originalPost = await feedRepository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Asha post to be reposted',
      });
      createdPostIds.push(originalPost.id);

      // Rahul reposts Asha's post
      const repost = await feedRepository.createPost({
        authorId: rahulId,
        kind: 'repost',
        repostOfId: originalPost.id,
      });
      createdPostIds.push(repost.id);

      const notifs = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, rahulId),
            eq(notifications.postId, originalPost.id),
            eq(notifications.type, 'repost'),
          ),
        );

      expect(notifs).toHaveLength(1);
      expect(notifs[0].type).toBe('repost');
      createdNotificationIds.push(notifs[0].id);
    });

    it('removing and repeating an action follows deduplication policy and resurfaces unread', async () => {
      const post = await feedRepository.createPost({
        authorId: ashaId,
        kind: 'original',
        text: 'Post for unlike and re-like test',
      });
      createdPostIds.push(post.id);

      // 1. Rahul likes
      await feedRepository.setLike(post.id, rahulId, true);
      const [notif1] = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, rahulId),
            eq(notifications.postId, post.id),
          ),
        );
      expect(notif1).toBeDefined();

      // Asha marks it as read
      await notificationsService.markAsRead(notif1.id, ashaId);
      const [readNotif] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notif1.id));
      expect(readNotif.isRead).toBe(true);

      // 2. Rahul unlikes
      await feedRepository.setLike(post.id, rahulId, false);

      // 3. Rahul likes again
      await feedRepository.setLike(post.id, rahulId, true);

      // Notification row must be deduplicated, reset to unread, and updated
      const notifsAfter = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.recipientId, ashaId),
            eq(notifications.actorId, rahulId),
            eq(notifications.postId, post.id),
          ),
        );

      expect(notifsAfter).toHaveLength(1);
      expect(notifsAfter[0].id).toBe(notif1.id);
      expect(notifsAfter[0].isRead).toBe(false);
      expect(notifsAfter[0].readAt).toBeNull();
      createdNotificationIds.push(notif1.id);
    });
  });

  describe('Inbox Listing, Pagination & Ordering', () => {
    it('returns notifications newest-first with deterministic ordering', async () => {
      const recipientId = randomUUID();
      createdUserIds.push(recipientId);

      await db.insert(users).values({
        id: recipientId,
        handle: `user_${recipientId.slice(0, 8)}`,
        displayName: 'Test Recipient',
      });

      // Insert 3 notifications with distinct timestamps
      const notif1Id = randomUUID();
      const notif2Id = randomUUID();
      createdNotificationIds.push(notif1Id, notif2Id);

      const t1 = new Date('2026-01-01T10:00:00.000Z');
      const t2 = new Date('2026-01-01T11:00:00.000Z');

      await db.insert(notifications).values([
        {
          id: notif1Id,
          recipientId,
          actorId: ashaId,
          type: 'follow',
          dedupKey: `follow:${ashaId}:${recipientId}`,
          createdAt: t1,
          isRead: false,
        },
        {
          id: notif2Id,
          recipientId,
          actorId: rahulId,
          type: 'follow',
          dedupKey: `follow:${rahulId}:${recipientId}`,
          createdAt: t2,
          isRead: false,
        },
      ]);

      const inbox = await notificationsService.listNotifications(
        recipientId,
        null,
        10,
      );

      expect(inbox.items.length).toBe(2);
      expect(inbox.items[0].id).toBe(notif2Id); // newest first
      expect(inbox.items[1].id).toBe(notif1Id);
    });

    it('handles equal timestamps deterministically without skipping records across pages', async () => {
      const recipientId = randomUUID();
      createdUserIds.push(recipientId);

      await db.insert(users).values({
        id: recipientId,
        handle: `tied_${recipientId.slice(0, 8)}`,
        displayName: 'Tied Timestamp User',
      });

      const sameTime = new Date('2026-03-01T12:00:00.000Z');

      // Create 3 temporary actors to have 3 distinct notifications at the exact same timestamp
      const actor1 = randomUUID();
      const actor2 = randomUUID();
      const actor3 = randomUUID();
      createdUserIds.push(actor1, actor2, actor3);

      await db.insert(users).values([
        {
          id: actor1,
          handle: `act1_${actor1.slice(0, 6)}`,
          displayName: 'Act 1',
        },
        {
          id: actor2,
          handle: `act2_${actor2.slice(0, 6)}`,
          displayName: 'Act 2',
        },
        {
          id: actor3,
          handle: `act3_${actor3.slice(0, 6)}`,
          displayName: 'Act 3',
        },
      ]);

      const notifIds = [randomUUID(), randomUUID(), randomUUID()].sort().reverse();
      createdNotificationIds.push(...notifIds);

      await db.insert(notifications).values([
        {
          id: notifIds[0],
          recipientId,
          actorId: actor1,
          type: 'follow',
          dedupKey: `follow:${actor1}:${recipientId}`,
          createdAt: sameTime,
        },
        {
          id: notifIds[1],
          recipientId,
          actorId: actor2,
          type: 'follow',
          dedupKey: `follow:${actor2}:${recipientId}`,
          createdAt: sameTime,
        },
        {
          id: notifIds[2],
          recipientId,
          actorId: actor3,
          type: 'follow',
          dedupKey: `follow:${actor3}:${recipientId}`,
          createdAt: sameTime,
        },
      ]);

      // Page 1 with limit 2
      const page1 = await notificationsService.listNotifications(
        recipientId,
        null,
        2,
      );

      expect(page1.items).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeDefined();

      // Page 2 using cursor
      const page2 = await notificationsService.listNotifications(
        recipientId,
        page1.nextCursor,
        2,
      );

      expect(page2.items).toHaveLength(1);

      const allIds = [
        ...page1.items.map((i) => i.id),
        ...page2.items.map((i) => i.id),
      ];

      // No skips, no duplicates
      expect(new Set(allIds).size).toBe(3);
      expect(allIds).toEqual(notifIds);
    });

    it('returns empty list for a recipient with no notifications', async () => {
      const freshUser = randomUUID();
      createdUserIds.push(freshUser);

      await db.insert(users).values({
        id: freshUser,
        handle: `fresh_${freshUser.slice(0, 8)}`,
        displayName: 'Fresh User',
      });

      const inbox = await notificationsService.listNotifications(
        freshUser,
        null,
        10,
      );

      expect(inbox.items).toHaveLength(0);
      expect(inbox.hasMore).toBe(false);
      expect(inbox.nextCursor).toBeNull();

      const unread = await notificationsService.getUnreadCount(freshUser);
      expect(unread.unreadCount).toBe(0);
    });
  });

  describe('Mark-as-Read & Unread Count', () => {
    it('accurately maintains unread count across reads and repeats', async () => {
      const recipientId = randomUUID();
      createdUserIds.push(recipientId);

      await db.insert(users).values({
        id: recipientId,
        handle: `ur_${recipientId.slice(0, 8)}`,
        displayName: 'Unread Test User',
      });

      const n1 = randomUUID();
      const n2 = randomUUID();
      createdNotificationIds.push(n1, n2);

      await db.insert(notifications).values([
        {
          id: n1,
          recipientId,
          actorId: ashaId,
          type: 'follow',
          dedupKey: `follow:${ashaId}:${recipientId}`,
          isRead: false,
        },
        {
          id: n2,
          recipientId,
          actorId: rahulId,
          type: 'follow',
          dedupKey: `follow:${rahulId}:${recipientId}`,
          isRead: false,
        },
      ]);

      let unread = await notificationsService.getUnreadCount(recipientId);
      expect(unread.unreadCount).toBe(2);

      // Mark n1 as read
      await notificationsService.markAsRead(n1, recipientId);
      unread = await notificationsService.getUnreadCount(recipientId);
      expect(unread.unreadCount).toBe(1);

      // Repeat mark n1 as read (idempotent, unread count does not corrupt)
      await notificationsService.markAsRead(n1, recipientId);
      unread = await notificationsService.getUnreadCount(recipientId);
      expect(unread.unreadCount).toBe(1);

      // Mark all read
      const markAll = await notificationsService.markAllAsRead(recipientId);
      expect(markAll.updatedCount).toBe(1);

      unread = await notificationsService.getUnreadCount(recipientId);
      expect(unread.unreadCount).toBe(0);

      // Repeat mark all read (idempotent)
      const repeatMarkAll = await notificationsService.markAllAsRead(
        recipientId,
      );
      expect(repeatMarkAll.updatedCount).toBe(0);
      unread = await notificationsService.getUnreadCount(recipientId);
      expect(unread.unreadCount).toBe(0);
    });

    it('rejects cross-user mark-as-read without changing database state', async () => {
      const recipientA = randomUUID();
      const recipientB = randomUUID();
      createdUserIds.push(recipientA, recipientB);

      await db.insert(users).values([
        {
          id: recipientA,
          handle: `rec_a_${recipientA.slice(0, 6)}`,
          displayName: 'Recipient A',
        },
        {
          id: recipientB,
          handle: `rec_b_${recipientB.slice(0, 6)}`,
          displayName: 'Recipient B',
        },
      ]);

      const notifId = randomUUID();
      createdNotificationIds.push(notifId);

      await db.insert(notifications).values({
        id: notifId,
        recipientId: recipientA,
        actorId: ashaId,
        type: 'follow',
        dedupKey: `follow:${ashaId}:${recipientA}`,
        isRead: false,
      });

      // Recipient B tries to mark Recipient A's notification as read
      await expect(
        notificationsService.markAsRead(notifId, recipientB),
      ).rejects.toThrow();

      // State remains completely unchanged
      const [persisted] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, notifId));

      expect(persisted.isRead).toBe(false);
      expect(persisted.readAt).toBeNull();
    });
  });

  describe('Deactivation & Deletion Policy Enforcement', () => {
    it('omits notifications from deactivated actors', async () => {
      const recipientId = randomUUID();
      const deactivatingActorId = randomUUID();
      createdUserIds.push(recipientId, deactivatingActorId);

      await db.insert(users).values([
        {
          id: recipientId,
          handle: `rec_${recipientId.slice(0, 8)}`,
          displayName: 'Recipient',
        },
        {
          id: deactivatingActorId,
          handle: `deact_${deactivatingActorId.slice(0, 8)}`,
          displayName: 'Deactivating Actor',
        },
      ]);

      const notifId = randomUUID();
      createdNotificationIds.push(notifId);

      await db.insert(notifications).values({
        id: notifId,
        recipientId,
        actorId: deactivatingActorId,
        type: 'follow',
        dedupKey: `follow:${deactivatingActorId}:${recipientId}`,
        isRead: false,
      });

      // Before deactivation: visible
      let inbox = await notificationsService.listNotifications(
        recipientId,
        null,
        10,
      );
      expect(inbox.items).toHaveLength(1);

      // Actor deactivates
      await db
        .update(users)
        .set({ deactivatedAt: new Date() })
        .where(eq(users.id, deactivatingActorId));

      // After deactivation: filtered out
      inbox = await notificationsService.listNotifications(
        recipientId,
        null,
        10,
      );
      expect(inbox.items).toHaveLength(0);

      const unread = await notificationsService.getUnreadCount(recipientId);
      expect(unread.unreadCount).toBe(0);
    });

    it('omits notifications referencing soft-deleted posts', async () => {
      const recipientId = randomUUID();
      createdUserIds.push(recipientId);

      await db.insert(users).values({
        id: recipientId,
        handle: `del_rec_${recipientId.slice(0, 8)}`,
        displayName: 'Delete Recipient',
      });

      const post = await feedRepository.createPost({
        authorId: recipientId,
        kind: 'original',
        text: 'Post to be soft-deleted',
      });
      createdPostIds.push(post.id);

      // Rahul likes the post
      await feedRepository.setLike(post.id, rahulId, true);

      let inbox = await notificationsService.listNotifications(
        recipientId,
        null,
        10,
      );
      expect(inbox.items.some((i) => i.post?.id === post.id)).toBe(true);

      // Soft delete the post
      await feedRepository.deletePost({
        postId: post.id,
        authorId: recipientId,
      });

      // Notification is now omitted
      inbox = await notificationsService.listNotifications(
        recipientId,
        null,
        10,
      );
      expect(inbox.items.some((i) => i.post?.id === post.id)).toBe(false);

      const unread = await notificationsService.getUnreadCount(recipientId);
      expect(unread.unreadCount).toBe(0);
    });
  });
});
