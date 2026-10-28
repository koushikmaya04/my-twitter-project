-- PRD 03 — Constraint Tests
-- Each invalid statement is isolated with a SAVEPOINT.
-- Expected behavior: every INSERT fails, then the error is
-- recovered with ROLLBACK TO SAVEPOINT so the next test runs.

BEGIN;


-- ============================================================
-- TEST 1 — Duplicate like
-- Expected: FAIL — likes_pk
-- ============================================================

SAVEPOINT test_1;

INSERT INTO likes (user_id, post_id)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
    '11111111-1111-4111-8111-111111111111'
);

ROLLBACK TO SAVEPOINT test_1;


-- ============================================================
-- TEST 2 — Self-follow
-- Expected: FAIL — follows_no_self_follow
-- ============================================================

SAVEPOINT test_2;

INSERT INTO follows (follower_id, following_id)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

ROLLBACK TO SAVEPOINT test_2;


-- ============================================================
-- TEST 3 — Duplicate follow
-- Expected: FAIL — follows_pk
-- ============================================================

SAVEPOINT test_3;

INSERT INTO follows (follower_id, following_id)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);

ROLLBACK TO SAVEPOINT test_3;


-- ============================================================
-- TEST 4 — Invalid post kind
-- Expected: FAIL — posts_kind_check
-- ============================================================

SAVEPOINT test_4;

INSERT INTO posts (
    id,
    author_id,
    kind,
    text,
    created_at
)
VALUES (
    '99999999-9999-4999-8999-999999999991',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'invalid',
    'Invalid post kind',
    '2026-09-02T10:00:00.000Z'
);

ROLLBACK TO SAVEPOINT test_4;


-- ============================================================
-- TEST 5 — Repost containing text
-- Expected: FAIL — posts_text_check
-- ============================================================

SAVEPOINT test_5;

INSERT INTO posts (
    id,
    author_id,
    kind,
    text,
    repost_of_id,
    created_at
)
VALUES (
    '99999999-9999-4999-8999-999999999992',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
    'repost',
    'Repost text should fail',
    '11111111-1111-4111-8111-111111111111',
    '2026-09-02T10:01:00.000Z'
);

ROLLBACK TO SAVEPOINT test_5;


-- ============================================================
-- TEST 6 — Original with reply_to_id
-- Expected: FAIL — posts_kind_relationship_check
-- ============================================================

SAVEPOINT test_6;

INSERT INTO posts (
    id,
    author_id,
    kind,
    text,
    reply_to_id,
    created_at
)
VALUES (
    '99999999-9999-4999-8999-999999999993',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'original',
    'Invalid original relationship',
    '22222222-2222-4222-8222-222222222221',
    '2026-09-02T10:02:00.000Z'
);

ROLLBACK TO SAVEPOINT test_6;


-- ============================================================
-- TEST 7 — Reply without reply_to_id
-- Expected: FAIL — posts_kind_relationship_check
-- ============================================================

SAVEPOINT test_7;

INSERT INTO posts (
    id,
    author_id,
    kind,
    text,
    created_at
)
VALUES (
    '99999999-9999-4999-8999-999999999994',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'reply',
    'Reply without target',
    '2026-09-02T10:03:00.000Z'
);

ROLLBACK TO SAVEPOINT test_7;


-- ============================================================
-- TEST 8 — Empty post text
-- Expected: FAIL — posts_text_check
-- ============================================================

SAVEPOINT test_8;

INSERT INTO posts (
    id,
    author_id,
    kind,
    text,
    created_at
)
VALUES (
    '99999999-9999-4999-8999-999999999995',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'original',
    '   ',
    '2026-09-02T10:04:00.000Z'
);

ROLLBACK TO SAVEPOINT test_8;


-- ============================================================
-- TEST 9 — Text longer than 280 characters
-- Expected: FAIL — posts_text_check
-- ============================================================

SAVEPOINT test_9;

INSERT INTO posts (
    id,
    author_id,
    kind,
    text,
    created_at
)
VALUES (
    '99999999-9999-4999-8999-999999999996',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'original',
    repeat('x', 281),
    '2026-09-02T10:05:00.000Z'
);

ROLLBACK TO SAVEPOINT test_9;


-- ============================================================
-- TEST 10 — Invalid media position
-- Expected: FAIL — post_media_position_check
-- ============================================================

SAVEPOINT test_10;

INSERT INTO post_media (
    id,
    post_id,
    position,
    small_url,
    large_url,
    width,
    height,
    alt_text
)
VALUES (
    '99999999-9999-4999-8999-999999999997',
    '11111111-1111-4111-8111-111111111111',
    4,
    'https://example.com/small.jpg',
    'https://example.com/large.jpg',
    800,
    600,
    'Invalid position'
);

ROLLBACK TO SAVEPOINT test_10;


-- ============================================================
-- TEST 11 — Duplicate media position
-- Expected: FAIL — post_media_position_unique
-- ============================================================

SAVEPOINT test_11;

INSERT INTO post_media (
    id,
    post_id,
    position,
    small_url,
    large_url,
    width,
    height,
    alt_text
)
VALUES (
    '99999999-9999-4999-8999-999999999998',
    '11111111-1111-4111-8111-111111111111',
    0,
    'https://example.com/small-duplicate.jpg',
    'https://example.com/large-duplicate.jpg',
    800,
    600,
    'Duplicate position'
);

ROLLBACK TO SAVEPOINT test_11;


-- ============================================================
-- TEST 12 — Invalid media dimensions
-- Expected: FAIL — post_media_width_check
-- ============================================================

SAVEPOINT test_12;

INSERT INTO post_media (
    id,
    post_id,
    position,
    small_url,
    large_url,
    width,
    height,
    alt_text
)
VALUES (
    '99999999-9999-4999-8999-999999999999',
    '11111111-1111-4111-8111-111111111111',
    1,
    'https://example.com/small-invalid.jpg',
    'https://example.com/large-invalid.jpg',
    0,
    600,
    'Invalid dimensions'
);

ROLLBACK TO SAVEPOINT test_12;


-- ============================================================
-- Final rollback
-- ============================================================

ROLLBACK;