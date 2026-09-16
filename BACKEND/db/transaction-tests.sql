-- PRD 03 — Transaction and Concurrency Tests
--
-- This file demonstrates:
-- 1. Transaction rollback after a failed write.
-- 2. Duplicate-like protection under concurrent attempts.
--
-- The tests must not permanently change the seeded database.


-- ============================================================
-- TEST 1 — Transaction rollback
-- ============================================================

-- Record the current number of likes.
SELECT COUNT(*) AS likes_before
FROM likes;


-- Start transaction.
BEGIN;

-- Valid write.
-- This temporarily adds a like.
INSERT INTO likes (
    user_id,
    post_id
)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
    '11111111-1111-4111-8111-111111111111'
)
ON CONFLICT (user_id, post_id) DO NOTHING;


-- Confirm that the transaction can see the temporary row.
SELECT COUNT(*) AS likes_inside_transaction
FROM likes;


-- Force a failure.
-- The duplicate primary key should cause an error.
INSERT INTO likes (
    user_id,
    post_id
)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
    '11111111-1111-4111-8111-111111111111'
);


-- IMPORTANT:
-- After the intentional error, PostgreSQL marks the transaction
-- as aborted.
--
-- Therefore, execute ROLLBACK as a separate command after the
-- failed INSERT if pgAdmin does not continue automatically.

ROLLBACK;


-- Verify that the temporary valid write was also rolled back.
SELECT COUNT(*) AS likes_after_rollback
FROM likes;

-- OUTPUT Rollback test result: PASS
-- Likes before transaction: 15
-- Valid insert inside transaction: executed
-- Intentional duplicate insert: rejected by likes_pk
-- Transaction: rolled back
-- Likes after rollback: 15

-- Conclusion:
-- The transaction rollback successfully removed the valid write that
-- occurred before the failure. The seeded database remained unchanged.


-- ============================================================
-- TEST 2 — Duplicate-like protection
-- ============================================================

-- The seeded database already contains this like:
--
-- user = kiran
-- post = original 1
--
-- Therefore a second insert must be rejected by likes_pk.


INSERT INTO likes (
    user_id,
    post_id
)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
    '11111111-1111-4111-8111-111111111111'
);


-- Expected result:
--
-- ERROR: duplicate key value violates unique constraint "likes_pk"
--
-- This proves that the same user cannot create another like
-- for the same post.


-- ============================================================
-- TEST 3 — Verify no duplicate row was created
-- ============================================================

SELECT
    user_id,
    post_id,
    COUNT(*) AS like_rows
FROM likes
WHERE user_id =
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab'
  AND post_id =
    '11111111-1111-4111-8111-111111111111'
GROUP BY user_id, post_id;


-- Expected:
--
-- like_rows = 1


-- ============================================================
-- FINAL SEED COUNT CHECK
-- ============================================================

SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM posts WHERE kind = 'original') AS originals,
    (SELECT COUNT(*) FROM posts WHERE kind = 'reply') AS replies,
    (SELECT COUNT(*) FROM posts WHERE kind = 'repost') AS reposts,
    (SELECT COUNT(*) FROM post_media) AS media,
    (SELECT COUNT(*) FROM likes) AS likes,
    (SELECT COUNT(*) FROM follows) AS follows;  


    -- ============================================================
-- CONCURRENCY TEST RESULT
-- ============================================================
--
-- Session A successfully inserted:
--   dev -> post 140
--
-- Session B attempted the same (user_id, post_id).
-- Session B waited for Session A's transaction and then failed
-- with the likes_pk unique constraint after Session A committed.
--
-- Final verification:
--   Matching like rows = 1
--   Total likes = 16
--
-- Result: PASS
--
-- PostgreSQL's primary key on (user_id, post_id) prevents
-- concurrent duplicate likes from creating multiple rows.