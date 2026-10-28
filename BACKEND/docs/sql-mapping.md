# SQL Mapping Document — PRD 04

This document maps each of the ten SQL modeling queries defined in PRD 03 (`db/queries.sql`) to its corresponding repository method and response fields in the NestJS + Drizzle ORM implementation.

---

## Query 1: Home Feed (Originals Only)

### Modeling SQL Reference
```sql
SELECT
    p.id,
    p.author_id,
    u.handle,
    u.display_name,
    p.kind,
    p.text,
    p.created_at
FROM posts p
JOIN users u
    ON u.id = p.author_id
WHERE p.kind = 'original'
  AND (p.created_at, p.id) < ($1::timestamptz, $2::uuid)
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;
```

### Repository Implementation
- **Method**: `DrizzleSocialFeedRepository.listOriginalFeed(cursor: string | null, limit: number, viewerId: string)`
- **Query mechanism**: Drizzle query on `posts` inner joined with `users`, filtered with `eq(posts.kind, 'original')` and tuple cursor condition `(createdAt, id) < (cursor.createdAt, cursor.id)`, ordered by `desc(posts.createdAt), desc(posts.id)`.
- **Batch Hydration**: Eliminates N+1 loops via `hydratePosts(...)` which performs bounded O(1) queries for media, likes, replies, and viewer likes.

### Response Mapping
| SQL Source Column / Expression | DTO / Record Property | Type |
|---|---|---|
| `p.id` | `items[].id` | `string` (UUID) |
| `p.kind` | `items[].kind` | `'original'` |
| `p.text` | `items[].text` | `string \| null` |
| `p.created_at` | `items[].createdAt` | `string` (ISO 8601) |
| `u.id` | `items[].author.id` | `string` (UUID) |
| `u.handle` | `items[].author.handle` | `string` |
| `u.display_name` | `items[].author.displayName` | `string` |
| In-memory default | `items[].author.avatar` | `{ smallUrl: '', largeUrl: '' }` |
| Batch query (`post_media`) | `items[].media` | `MediaRecord[]` |
| Batch query (`likes` count) | `items[].likeCount` | `number` |
| Batch query (`posts` reply count) | `items[].replyCount` | `number` |
| Batch query (`likes` for viewer) | `items[].likedByViewer` | `boolean` |
| `p.reply_to_id` | `items[].replyToId` | `string \| null` |
| `p.repost_of_id` | `items[].repostOfId` | `string \| null` |
| Derived from `limit + 1` | `hasMore` | `boolean` |
| Last item `(created_at, id)` | `nextCursor` | `string \| null` (base64url) |

---

## Query 2: Single Post Detail

### Modeling SQL Reference
```sql
SELECT
    p.id,
    p.author_id,
    u.handle,
    u.display_name,
    p.kind,
    p.text,
    p.created_at,
    p.reply_to_id,
    p.repost_of_id,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM posts r WHERE r.reply_to_id = p.id) AS reply_count
FROM posts p
JOIN users u
    ON u.id = p.author_id
WHERE p.id = $1::uuid;
```

### Repository Implementation
- **Method**: `DrizzleSocialFeedRepository.getPostById(id: string, viewerId: string, executor?: any)`
- **Query mechanism**: Direct select with join on `users` where `posts.id = id`. Separate aggregation queries for media, like count, reply count, and viewer like to avoid row multiplication.
- **Executor support**: Accepts optional transaction `tx` to support transactional reads inside write flows (`createPost`).

### Response Mapping
| SQL Source Column / Expression | DTO / Record Property | Type |
|---|---|---|
| `p.id` | `id` | `string` (UUID) |
| `p.kind` | `kind` | `'original' \| 'reply' \| 'repost'` |
| `p.text` | `text` | `string \| null` |
| `p.created_at` | `createdAt` | `string` (ISO 8601) |
| `u.id` | `author.id` | `string` (UUID) |
| `u.handle` | `author.handle` | `string` |
| `u.display_name` | `author.displayName` | `string` |
| Aggregated `post_media` | `media` | `MediaRecord[]` |
| `COUNT(*) FROM likes` | `likeCount` | `number` |
| `COUNT(*) FROM posts WHERE reply_to_id` | `replyCount` | `number` |
| `EXISTS (SELECT 1 FROM likes WHERE user_id = viewerId)` | `likedByViewer` | `boolean` |
| `p.reply_to_id` | `replyToId` | `string \| null` |
| `p.repost_of_id` | `repostOfId` | `string \| null` |

---

## Query 3: Direct Replies

### Modeling SQL Reference
```sql
SELECT
    p.id,
    p.author_id,
    u.handle,
    u.display_name,
    p.text,
    p.created_at
FROM posts p
JOIN users u
    ON u.id = p.author_id
WHERE p.kind = 'reply'
  AND p.reply_to_id = $1::uuid
  AND (p.created_at, p.id) < ($2::timestamptz, $3::uuid)
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;
```

### Repository Implementation
- **Method**: `DrizzleSocialFeedRepository.listReplies(postId: string, cursor: string | null, limit: number, viewerId: string)`
- **Query mechanism**: Selects posts where `kind = 'reply'` and `replyToId = postId`. Uses tuple cursor pagination `(createdAt, id) < cursor` and batch post hydration.

### Response Mapping
- Returns `PaginatedResult<PostRecord>`.
- Mapped identically to `PostRecord` in Query 1, guaranteeing no N+1 query loops.

---

## Query 4: Profile Media

### Modeling SQL Reference
```sql
SELECT
    pm.id,
    pm.post_id,
    p.created_at,
    pm.position,
    pm.alt_text,
    pm.width,
    pm.height,
    pm.small_url,
    pm.large_url
FROM post_media pm
JOIN posts p
    ON p.id = pm.post_id
WHERE p.author_id = $1::uuid
  AND p.kind = 'original'
  AND (
        p.created_at < $2::timestamptz
        OR (p.created_at = $2::timestamptz AND pm.id < $3::uuid)
      )
ORDER BY
    p.created_at DESC,
    pm.id DESC
LIMIT 11;
```

### Repository Implementation
- **Method**: `DrizzleSocialFeedRepository.listProfileMedia(userId: string, cursor: string | null, limit: number)`
- **Query mechanism**: Inner joins `post_media` with `posts` on `post_media.postId = posts.id`, filtered by `posts.authorId = userId` and `posts.kind = 'original'`. Ordered deterministically by `desc(posts.createdAt), desc(postMedia.id)` with `limit + 1`.

### Response Mapping
| SQL Source Column | MediaRecord Property | Type |
|---|---|---|
| `pm.id` | `items[].id` | `string` (UUID) |
| `pm.alt_text` | `items[].altText` | `string` |
| `pm.width` | `items[].width` | `number` |
| `pm.height` | `items[].height` | `number` |
| `pm.position` | `items[].position` | `number` |
| `pm.small_url` | `items[].smallUrl` | `string` |
| `pm.large_url` | `items[].largeUrl` | `string` |
| `(p.created_at, pm.id)` | `nextCursor` | `string \| null` (base64url) |
| `rows.length > limit` | `hasMore` | `boolean` |

---

## Query 5: Profile Statistics

### Modeling SQL Reference
```sql
SELECT
    u.id,
    u.handle,
    u.display_name,
    (
        SELECT COUNT(*)
        FROM posts p
        WHERE p.author_id = u.id
          AND p.kind = 'original'
    ) AS original_count,
    (
        SELECT COUNT(*)
        FROM follows f
        WHERE f.following_id = u.id
    ) AS follower_count,
    (
        SELECT COUNT(*)
        FROM follows f
        WHERE f.follower_id = u.id
    ) AS following_count
FROM users u
WHERE u.id = $1::uuid;
```

### Repository Implementation
- **Method**: `DrizzleSocialFeedRepository.getUserById(id: string)`
- **Query mechanism**: Queries `users` for basic identity. Computes `postCount`, `followerCount`, and `followingCount` using database SQL `count(*)::int` aggregations instead of loading full row sets into memory.

### Response Mapping
| SQL Source Column / Aggregation | UserRecord Property | Type |
|---|---|---|
| `u.id` | `id` | `string` (UUID) |
| `u.handle` | `handle` | `string` |
| `u.display_name` | `displayName` | `string` |
| Database schema does not store bio | `bio` | `null` |
| Database schema does not store avatar | `avatar` | `{ smallUrl: '', largeUrl: '' }` |
| `COUNT(*) WHERE author_id AND kind='original'` | `postCount` | `number` |
| `COUNT(*) WHERE following_id = id` | `followerCount` | `number` |
| `COUNT(*) WHERE follower_id = id` | `followingCount` | `number` |

---

## Query 6: Like Totals for a Batch of Posts

### Modeling SQL Reference
```sql
SELECT
    post_ids.post_id,
    COUNT(l.post_id) AS like_count
FROM (VALUES (...)) AS post_ids(post_id)
LEFT JOIN likes l
    ON l.post_id = post_ids.post_id
GROUP BY post_ids.post_id;
```

### Repository Implementation
- **Method**: `DrizzleSocialFeedRepository.hydratePosts(...)`
- **Query mechanism**:
  ```ts
  await executor
    .select({ postId: likes.postId, count: sql<number>`count(*)::int` })
    .from(likes)
    .where(inArray(likes.postId, postIds))
    .groupBy(likes.postId);
  ```
- **Response field**: Maps count directly to each `PostRecord.likeCount` in memory. Defaults to `0` if no likes exist for the post.

---

## Query 7: Viewer Like State

### Modeling SQL Reference
```sql
SELECT
    post_ids.post_id,
    EXISTS (
        SELECT 1
        FROM likes l
        WHERE l.user_id = $1::uuid
          AND l.post_id = post_ids.post_id
    ) AS viewer_has_liked
FROM (VALUES (...)) AS post_ids(post_id);
```

### Repository Implementation
- **Method**: `DrizzleSocialFeedRepository.hydratePosts(...)`
- **Query mechanism**:
  ```ts
  await executor
    .select({ postId: likes.postId })
    .from(likes)
    .where(and(eq(likes.userId, viewerId), inArray(likes.postId, postIds)));
  ```
- **Response field**: Adds matched post IDs to a `Set<string>`. Sets `PostRecord.likedByViewer = viewerLikedPostIds.has(post.id)`.

---

## Query 8: Following Feed

### Modeling SQL Reference
```sql
SELECT
    p.id,
    p.author_id,
    u.handle,
    u.display_name,
    p.kind,
    p.text,
    p.created_at
FROM posts p
JOIN users u
    ON u.id = p.author_id
WHERE p.kind = 'original'
  AND EXISTS (
      SELECT 1
      FROM follows f
      WHERE f.follower_id = $1::uuid
        AND f.following_id = p.author_id
  )
  AND (p.created_at, p.id) < ($2::timestamptz, $3::uuid)
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;
```

### Repository Mapping & Access Path
- Supported by the `follows_following_idx` (`follows (following_id)`) index and `posts_feed_idx` (`posts (created_at DESC, id DESC)`).
- When a following filter is applied, `EXISTS (SELECT 1 FROM follows WHERE follower_id = viewerId AND following_id = posts.authorId)` is used to prevent duplicate rows caused by relation joins.

---

## Query 9: Text Search

### Modeling SQL Reference
```sql
SELECT
    p.id,
    p.author_id,
    u.handle,
    u.display_name,
    p.text,
    p.created_at
FROM posts p
JOIN users u
    ON u.id = p.author_id
WHERE p.kind = 'original'
  AND p.text ILIKE
      '%'
      || replace(replace(replace($1, '\', '\\'), '%', '\%'), '_', '\_')
      || '%'
      ESCAPE '\'
  AND (p.created_at, p.id) < ($2::timestamptz, $3::uuid)
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;
```

### Repository Implementation
- **Method**: `DrizzleSocialFeedRepository.searchOriginals(query: string, cursor: string | null, limit: number, viewerId: string)`
- **Query mechanism**: Truncates search query to 200 characters. Escapes `\`, `%`, and `_` characters. Uses parameterized `sql`${posts.text} ILIKE ${`%${safeQuery}%`} ESCAPE '\\''. Employs batch post hydration.

### Response Mapping
- Returns `PaginatedResult<PostRecord>` with matching original posts.

---

## Query 10: Repost Lookup & Constraints

### Modeling SQL Reference
```sql
SELECT
    repost.id AS repost_id,
    repost.created_at AS repost_created_at,
    original.id AS original_post_id,
    original.text AS original_text,
    original.created_at AS original_created_at,
    original_author.id AS original_author_id,
    original_author.handle AS original_author_handle,
    original_author.display_name AS original_author_display_name
FROM posts repost
JOIN posts original
    ON original.id = repost.repost_of_id
JOIN users original_author
    ON original_author.id = original.author_id
WHERE repost.author_id = $1::uuid;
```

### Repository Implementation
- **Write Method**: `DrizzleSocialFeedRepository.createPost(command: CreatePostCommand)`
  - Validation: Enforces target must exist (`NotFoundDomainError` / 404).
  - Validation: Target must be `'original'` (`InvalidTargetError` / 422).
  - Constraint: Enforced by database unique partial index `posts_unique_user_repost` on `(author_id, repost_of_id) WHERE kind = 'repost'`.
  - Error Mapping: PostgreSQL constraint violation code `23505` mapped to `ConflictDomainError` (409).
  - Transaction Boundary: Multi-step check and insert executed within `this.db.transaction(async (tx) => ...)`.
- **Read Method**: `getPostById(id, viewerId)` exposes `repostOfId` referencing the original post. Text remains `null` on repost rows to avoid duplicating original text.
