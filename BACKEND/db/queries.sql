-- ============================================================
-- PRD 03 — Required SQL Queries
-- Social Feed / PostgreSQL
--
-- The first 10 sections correspond to the PRD's required
-- SQL use cases.
--
-- List queries use stable ordering with created_at + id.
-- Cursor pagination uses the tuple:
--     (created_at, id)
--
-- Read queries use parameters ($1, $2, ...) rather than
-- concatenating values into SQL.
-- ============================================================


-- ============================================================
-- 1. HOME FEED
-- ============================================================
--
-- Requirement:
-- - Originals only
-- - Newest first
-- - Stable ordering
-- - Cursor pagination
-- - limit + 1 so the application can determine hasMore
--
-- Page size = 10
-- Therefore SQL LIMIT = 11.
-- ============================================================


-- 1A. First page
-- No cursor is supplied.

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
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;


-- 1B. Continuation page
--
-- $1 = created_at from the last row of the previous page
-- $2 = id from the last row of the previous page
--
-- Example cursor from the seeded page boundary:
-- $1 = '2026-09-01T09:52:00.000Z'
-- $2 = '11111111-1111-4111-8111-111111111120'

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


-- ============================================================
-- 2. SINGLE POST DETAIL
-- ============================================================
--
-- Requirement:
-- - One post
-- - Author information
-- - Reply/repost target reference
-- - Correct like count
-- - Correct reply count
--
-- Separate subqueries prevent joins from multiplying counts.
-- ============================================================

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

    (
        SELECT COUNT(*)
        FROM likes l
        WHERE l.post_id = p.id
    ) AS like_count,

    (
        SELECT COUNT(*)
        FROM posts r
        WHERE r.reply_to_id = p.id
    ) AS reply_count

FROM posts p
JOIN users u
    ON u.id = p.author_id
WHERE p.id = $1::uuid;


-- ============================================================
-- 3. DIRECT REPLIES
-- ============================================================
--
-- Requirement:
-- - Replies to one original
-- - Stable descending timestamp/id
-- - Cursor continuation
-- - limit + 1
-- ============================================================


-- 3A. First page
--
-- $1 = original post ID

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
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;


-- 3B. Continuation page
--
-- $1 = original post ID
-- $2 = created_at from previous page's last reply
-- $3 = id from previous page's last reply

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


-- ============================================================
-- 4. PROFILE MEDIA
-- ============================================================
--
-- Requirement:
-- - Media belonging to a user's originals
-- - alt text
-- - dimensions
-- - small/large URL variants
-- - stable pagination
--
-- Cursor:
--     (post_created_at, post_id, media_position)
--
-- This gives deterministic ordering even when a post has
-- multiple media rows.
-- ============================================================


-- 4A. First page
--
-- $1 = user ID

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
ORDER BY
    p.created_at DESC,
    p.id DESC,
    pm.position ASC
LIMIT 11;


-- 4B. Continuation page
--
-- $1 = user ID
-- $2 = post created_at from previous page
-- $3 = post ID from previous page
-- $4 = media position from previous page

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
        OR (
            p.created_at = $2::timestamptz
            AND p.id < $3::uuid
        )
        OR (
            p.created_at = $2::timestamptz
            AND p.id = $3::uuid
            AND pm.position > $4::integer
        )
      )
ORDER BY
    p.created_at DESC,
    p.id DESC,
    pm.position ASC
LIMIT 11;


-- ============================================================
-- 5. PROFILE STATISTICS
-- ============================================================
--
-- Requirement:
-- - Number of originals
-- - Followers
-- - Following
-- - Must work for users with zero values
-- ============================================================

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


-- ============================================================
-- 6. LIKE TOTALS FOR A BATCH OF POSTS
-- ============================================================
--
-- Requirement:
-- - Count likes for multiple feed posts
-- - Include posts with zero likes
-- - Avoid N per-post queries
--
-- The VALUES list represents a batch of post IDs supplied
-- by the application.
-- ============================================================

SELECT
    post_ids.post_id,
    COUNT(l.post_id) AS like_count
FROM (
    VALUES
        ('11111111-1111-4111-8111-111111111111'::uuid),
        ('11111111-1111-4111-8111-111111111112'::uuid),
        ('11111111-1111-4111-8111-111111111113'::uuid),
        ('11111111-1111-4111-8111-111111111140'::uuid)
) AS post_ids(post_id)
LEFT JOIN likes l
    ON l.post_id = post_ids.post_id
GROUP BY post_ids.post_id
ORDER BY post_ids.post_id;


-- ============================================================
-- 7. VIEWER LIKE STATE
-- ============================================================
--
-- Requirement:
-- - Determine which posts the viewer has liked
-- - One query for a batch of posts
-- - Avoid N queries
--
-- $1 = viewer user ID
-- ============================================================

SELECT
    post_ids.post_id,
    EXISTS (
        SELECT 1
        FROM likes l
        WHERE l.user_id = $1::uuid
          AND l.post_id = post_ids.post_id
    ) AS viewer_has_liked
FROM (
    VALUES
        ('11111111-1111-4111-8111-111111111111'::uuid),
        ('11111111-1111-4111-8111-111111111112'::uuid),
        ('11111111-1111-4111-8111-111111111113'::uuid),
        ('11111111-1111-4111-8111-111111111140'::uuid)
) AS post_ids(post_id)
ORDER BY post_ids.post_id;


-- ============================================================
-- 8. FOLLOWING FEED
-- ============================================================
--
-- Requirement:
-- - Originals written by authors the viewer follows
-- - No duplicate rows
-- - Stable cursor pagination
--
-- EXISTS is used instead of joining follows directly.
-- This prevents duplicate post rows.
--
-- $1 = viewer user ID
-- ============================================================


-- 8A. First page

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
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;


-- 8B. Continuation page
--
-- $1 = viewer user ID
-- $2 = created_at from previous page
-- $3 = id from previous page

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


-- ============================================================
-- 9. TEXT SEARCH
-- ============================================================
--
-- Requirement:
-- - Case-insensitive
-- - Literal search
-- - Escape %, _
-- - Stable pagination
-- - No-match behavior
--
-- $1 = search term
-- $2 = cursor created_at (nullable)
-- $3 = cursor id (nullable)
--
-- The expression escapes:
--     \
--     %
--     _
--
-- before using the value in ILIKE.
-- ============================================================


-- 9A. Search first page

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
WHERE p.kind IN ('original', 'reply')
  AND p.text ILIKE
      '%'
      || replace(
           replace(
             replace($1, '\', '\\'),
             '%', '\%'
           ),
           '_', '\_'
         )
      || '%'
      ESCAPE '\'
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;


-- 9B. Search continuation page
--
-- $1 = search term
-- $2 = cursor created_at
-- $3 = cursor id

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
WHERE p.kind IN ('original', 'reply')
  AND p.text ILIKE
      '%'
      || replace(
           replace(
             replace($1, '\', '\\'),
             '%', '\%'
           ),
           '_', '\_'
         )
      || '%'
      ESCAPE '\'
  AND (p.created_at, p.id) < ($2::timestamptz, $3::uuid)
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;


-- 9C. Empty/no-match example
--
-- Expected result: zero rows.

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
WHERE p.kind IN ('original', 'reply')
  AND p.text ILIKE '%zzzz-no-match-seed-999%'
ORDER BY p.created_at DESC, p.id DESC
LIMIT 11;


-- ============================================================
-- 10. REPOST LOOKUP
-- ============================================================
--
-- Requirement:
-- - Find a user's reposts
-- - Return each repost
-- - Return the original post
-- - Return original author
-- - Do NOT duplicate original text into repost rows
--
-- $1 = user ID
-- ============================================================

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
WHERE repost.kind = 'repost'
  AND repost.author_id = $1::uuid
  AND original.kind = 'original'
ORDER BY repost.created_at DESC, repost.id DESC
LIMIT 11;


-- ============================================================
-- ADDITIONAL WRITE OPERATIONS
-- ============================================================
--
-- These are useful SQL examples, but they are NOT counted as
-- replacements for the ten required PRD read/use-case queries.
-- ============================================================


-- ============================================================
-- 11. LIKE A POST
-- ============================================================
--
-- $1 = viewer/user ID
-- $2 = post ID
--
-- ON CONFLICT makes repeated likes idempotent.
-- ============================================================

INSERT INTO likes (
    user_id,
    post_id
)
VALUES (
    $1::uuid,
    $2::uuid
)
ON CONFLICT (user_id, post_id) DO NOTHING;


-- ============================================================
-- 12. UNLIKE A POST
-- ============================================================
--
-- $1 = viewer/user ID
-- $2 = post ID
-- ============================================================

DELETE FROM likes
WHERE user_id = $1::uuid
  AND post_id = $2::uuid;


-- ============================================================
-- 13. FOLLOW A USER
-- ============================================================
--
-- $1 = follower user ID
-- $2 = user being followed
--
-- The database CHECK constraint prevents self-follow.
-- The primary key prevents duplicate follows.
-- ============================================================

INSERT INTO follows (
    follower_id,
    following_id
)
VALUES (
    $1::uuid,
    $2::uuid
)
ON CONFLICT (follower_id, following_id) DO NOTHING;


-- ============================================================
-- 14. UNFOLLOW A USER
-- ============================================================
--
-- $1 = follower user ID
-- $2 = user being unfollowed
-- ============================================================

DELETE FROM follows
WHERE follower_id = $1::uuid
  AND following_id = $2::uuid;


-- ============================================================
-- PRD 03 NOTES
-- ============================================================
--
-- 1. Cursor pagination uses:
--       (created_at, id)
--
--    This handles identical timestamps deterministically.
--
-- 2. List queries use LIMIT 11 for a requested page size of 10.
--    The application can return the first 10 rows and use the
--    11th row to determine whether another page exists.
--
-- 3. The home/following feeds select posts before joining
--    additional one-to-many data.
--
-- 4. Counts use separate aggregate/subqueries so that likes,
--    replies and media do not multiply each other.
--
-- 5. EXISTS is used for following-feed membership so one post
--    cannot be duplicated by multiple follow rows.
--
-- 6. Likes and follows are relations, not caller-controlled
--    counters.
--
-- 7. Database constraints enforce uniqueness and basic validity.
--    Cross-row/business rules such as:
--      - repost target must be an original
--      - media only belongs to originals
--      - maximum four media rows per post
--    are enforced by the service/transaction layer and should
--    be documented as such.
--
-- 8. Do not execute the entire file blindly against the seed
--    database because the write examples intentionally modify
--    likes/follows.
-- ============================================================