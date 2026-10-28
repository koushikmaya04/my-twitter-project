# Decision 06 — Notification Consistency, Deduplication, and Inbox Semantics

**Decision:** Implement an atomically consistent notification inbox stored in PostgreSQL via Drizzle ORM, coupled to source social mutations (follow, like, reply, repost) within single database transaction boundaries.

---

## 1. Options Considered

1. **Atomic In-Transaction Insertion (Selected):**
   Execute notification creation inside the same PostgreSQL transaction (`tx`) as the source mutation (`setLike`, `setFollow`, `createPost`).
   - *Pros:* Zero possibility of phantom notifications or orphaned source actions. No background workers, message queues, or distributed 2PC required.
   - *Cons:* Slightly longer transaction time for social mutations, but negligible given indexing and low write amplification.

2. **Transactional Outbox with Asynchronous Worker:**
   Write an outbox event in the source transaction and have an asynchronous processor deliver notifications.
   - *Pros:* Decouples source action latency from notification delivery.
   - *Cons:* Unnecessary architectural complexity, eventual consistency lag in inbox visibility, and requires background polling or queue infrastructure explicitly discouraged by the PRD.

3. **Application-Level Post-Commit Hooks:**
   Commit source mutation first, then execute separate notification insert outside transaction.
   - *Pros:* Simpler service separation.
   - *Cons:* Prone to dual-write failure: if the notification insert fails or process crashes, the action commits without a notification with no recovery mechanism.

---

## 2. Transaction Boundaries

- **Likes:** `DrizzleSocialFeedRepository.setLike` runs inside `this.db.transaction(async (tx) => ...)`.
  - Atomically verifies target post exists, is not deleted, and author is active.
  - Inserts `likes` record with `ON CONFLICT DO NOTHING RETURNING`.
  - If a new like is inserted AND `post.authorId !== viewerId`, atomically inserts the notification row.
  - If either fails, the entire transaction rolls back.
- **Follows:** `DrizzleSocialFeedRepository.setFollow` runs inside `this.db.transaction(async (tx) => ...)`.
  - Atomically verifies follower and target exist and are active.
  - Inserts `follows` record with `ON CONFLICT DO NOTHING RETURNING`.
  - If a new follow is inserted, atomically inserts the notification row.
  - If either fails, the entire transaction rolls back.
- **Replies & Reposts:** `DrizzleSocialFeedRepository.createPost` already runs inside `this.db.transaction(async (tx) => ...)`.
  - For direct replies: atomically verifies parent post is not deleted and author is active; inserts reply post; if `parent.authorId !== authorId`, inserts notification.
  - For reposts: atomically verifies target post is an original and not deleted; inserts repost; if `target.authorId !== authorId`, inserts notification.
  - Any error rolls back both the post and the notification.

---

## 3. Deduplication Semantics

To guarantee idempotency under concurrent retries and repeated actions:
- A database-enforced `UNIQUE INDEX` on `notifications.dedup_key`.
- Key structure:
  - Follow: `follow:${followerId}:${followingId}`
  - Like: `like:${actorId}:${postId}`
  - Repost: `repost:${actorId}:${repostOfId}`
  - Reply: `reply:${replyPostId}` (tied to the newly created reply post UUID)
- **Behavior on Remove & Repeat:**
  - When an action is removed (e.g. unfollow or unlike) and later repeated:
    - The new action succeeds in inserting the like/follow.
    - The notification insertion uses `ON CONFLICT (dedup_key) DO UPDATE SET is_read = false, read_at = NULL, created_at = NOW()`.
    - This resurfaces the notification deterministically for the recipient as unread at the top of their inbox without creating duplicate rows or corrupting cursor pagination.
  - When an action is retried without being removed (idempotent repeated call):
    - `likes` / `follows` insertion returns 0 rows due to `ON CONFLICT DO NOTHING`.
    - No notification update is triggered; existing read/unread state is preserved.

---

## 4. Mark-All-Read & Mark-One-Read Semantics

- **Mark-One-Read:**
  - `PATCH /notifications/:id/read` (or `POST /notifications/:id/read`).
  - Verifies notification belongs to authenticated user (`recipient_id = viewerId`).
  - Cross-user attempts are rejected with `403 Forbidden` (or `404 Not Found`), ensuring no state change occurs.
  - Idempotent: repeated calls on an already-read notification leave `read_at` and `is_read = true` intact, and do not corrupt unread count.
- **Mark-All-Read:**
  - `POST /notifications/read-all` (or `PATCH /notifications/read-all`).
  - Uses an explicit snapshot cutoff timestamp (`const cutoff = new Date()`):
    `UPDATE notifications SET is_read = true, read_at = NOW() WHERE recipient_id = viewerId AND is_read = false AND created_at <= cutoff`.
  - Concurrently arriving notifications with `created_at > cutoff` remain unread, preventing the user from accidentally missing new events that arrived while the request was in flight.

---

## 5. Deletion & Deactivation Display Policy

- **Deactivated Actors:**
  - Consistent with P0-02, interactions from deactivated accounts (`users.deactivatedAt IS NOT NULL`) are filtered out on read paths.
  - When querying the inbox or calculating unread count, an inner join to `users` on `notifications.actorId = users.id` with `users.deactivatedAt IS NULL` ensures deactivated users' notifications are omitted.
- **Deleted Content:**
  - Consistent with P0-05, soft-deleted posts (`posts.deletedAt IS NOT NULL`) are hidden.
  - Notifications referencing a deleted post are omitted from the inbox and unread counts, preventing private or removed content leakage.
- **Referential Integrity:**
  - Foreign keys:
    - `recipient_id` references `users(id)` with `ON DELETE CASCADE`.
    - `actor_id` references `users(id)` with `ON DELETE CASCADE`.
    - `post_id` references `posts(id)` with `ON DELETE CASCADE`.
    - `reply_id` references `posts(id)` with `ON DELETE CASCADE`.

---

## 6. Tests Proving It

1. Notification creation for like, follow, reply, repost.
2. Self-actions produce no notification.
3. Concurrent duplicate actions produce exactly one notification.
4. Transaction rollback on failure leaves no orphaned notifications.
5. Inbox ordering is deterministic and newest-first with cursor tie-breaking.
6. Cursor pagination handles equal timestamps deterministically without skips or duplicates.
7. Mark-one-read enforces recipient ownership and rejects cross-user writes safely.
8. Mark-all-read is race-safe against new arrivals.
9. Deactivated actor and deleted content filtering is strictly enforced.
10. Unread counts remain strictly accurate across repeated reads.
