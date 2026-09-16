## -- PRD 03 — Deterministic PostgreSQL Seed

-- Minimum required:
-- 6 users
-- 30 original posts
-- 12 replies
-- 4 reposts
-- 10 media rows
-- 15 likes
-- 8 follow edges
-----------------

-- Fixed UUIDs and UTC timestamps are used for reproducibility.
-- This seed is idempotent through ON CONFLICT DO NOTHING.

BEGIN;

-- =========================================================
-- USERS — 6
-- =========================================================

INSERT INTO users (id, handle, display_name, created_at)
VALUES
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'asha',
'Asha',
'2026-09-01T09:00:00.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'kiran',
'Kiran',
'2026-09-01T09:01:00.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'meera',
'Meera',
'2026-09-01T09:02:00.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'rahul',
'Rahul',
'2026-09-01T09:03:00.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'neha',
'Neha',
'2026-09-01T09:04:00.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'dev',
'Dev',
'2026-09-01T09:05:00.000Z'
)
ON CONFLICT DO NOTHING;

-- =========================================================
-- ORIGINAL POSTS — 30
-- =========================================================

INSERT INTO posts
(id, author_id, kind, text, created_at, reply_to_id, repost_of_id)
VALUES

-- Important timestamp tie:
(
'11111111-1111-4111-8111-111111111111',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'original',
'My first database-backed post',
'2026-09-01T10:00:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111112',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'original',
'A second post sharing the exact same timestamp',
'2026-09-01T10:00:00.000Z',
NULL,
NULL
),

(
'11111111-1111-4111-8111-111111111113',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'original',
'Learning PostgreSQL relational modeling',
'2026-09-01T09:59:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111114',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'original',
'Building a clean backend takes careful design',
'2026-09-01T09:58:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111115',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'original',
'Today I learned about database constraints',
'2026-09-01T09:57:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111116',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'original',
'Stable cursor pagination is useful',
'2026-09-01T09:56:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111117',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'original',
'Indexes should follow real access paths',
'2026-09-01T09:55:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111118',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'original',
'Foreign keys protect relationships',
'2026-09-01T09:54:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111119',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'original',
'Normalization keeps related data consistent',
'2026-09-01T09:53:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111120',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'original',
'PostgreSQL supports strong relational guarantees',
'2026-09-01T09:52:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111121',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'original',
'Small schemas can still demonstrate good SQL',
'2026-09-01T09:51:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111122',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'original',
'A composite key can model a relationship',
'2026-09-01T09:50:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111123',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'original',
'Likes belong in their own relation',
'2026-09-01T09:49:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111124',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'original',
'Follows are directional relationships',
'2026-09-01T09:48:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111125',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'original',
'Media positions should be deterministic',
'2026-09-01T09:47:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111126',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'original',
'Counts should be derived from relationships',
'2026-09-01T09:46:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111127',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'original',
'Transactions provide atomicity',
'2026-09-01T09:45:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111128',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'original',
'Concurrent writes need database guarantees',
'2026-09-01T09:44:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111129',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'original',
'SQL queries should have predictable access paths',
'2026-09-01T09:43:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111130',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'original',
'Clean data makes debugging easier',
'2026-09-01T09:42:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111131',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'original',
'Database design comes before ORM design',
'2026-09-01T09:41:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111132',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'original',
'Good constraints make invalid states harder to create',
'2026-09-01T09:40:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111133',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'original',
'Query plans help us understand database behavior',
'2026-09-01T09:39:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111134',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'original',
'Readable SQL is easier to review',
'2026-09-01T09:38:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111135',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'original',
'Cursor pagination needs deterministic ordering',
'2026-09-01T09:37:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111136',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'original',
'A timestamp alone is not always a unique cursor',
'2026-09-01T09:36:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111137',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'original',
'Stable ordering prevents duplicate pages',
'2026-09-01T09:35:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111138',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'original',
'Database constraints are part of application correctness',
'2026-09-01T09:34:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111139',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'original',
'This original intentionally has no reactions',
'2026-09-01T09:33:00.000Z',
NULL,
NULL
),
(
'11111111-1111-4111-8111-111111111140',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'original',
'This record helps test the third feed page',
'2026-09-01T09:32:00.000Z',
NULL,
NULL
)
ON CONFLICT DO NOTHING;

-- =========================================================
-- REPLIES — 12
-- =========================================================

INSERT INTO posts
(id, author_id, kind, text, created_at, reply_to_id, repost_of_id)
VALUES
(
'22222222-2222-4222-8222-222222222221',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'reply',
'Nice database design!',
'2026-09-01T10:01:00.000Z',
'11111111-1111-4111-8111-111111111111',
NULL
),
(
'22222222-2222-4222-8222-222222222222',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'reply',
'The timestamp tie is a useful test.',
'2026-09-01T10:01:01.000Z',
'11111111-1111-4111-8111-111111111111',
NULL
),
(
'22222222-2222-4222-8222-222222222223',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'reply',
'I agree with using UUIDs.',
'2026-09-01T10:01:02.000Z',
'11111111-1111-4111-8111-111111111111',
NULL
),
(
'22222222-2222-4222-8222-222222222224',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'reply',
'The schema is easy to understand.',
'2026-09-01T10:01:03.000Z',
'11111111-1111-4111-8111-111111111112',
NULL
),
(
'22222222-2222-4222-8222-222222222225',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'reply',
'Composite keys make sense here.',
'2026-09-01T10:01:04.000Z',
'11111111-1111-4111-8111-111111111113',
NULL
),
(
'22222222-2222-4222-8222-222222222226',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'reply',
'Good explanation of normalization.',
'2026-09-01T10:01:05.000Z',
'11111111-1111-4111-8111-111111111114',
NULL
),
(
'22222222-2222-4222-8222-222222222227',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'reply',
'Indexes should be measured rather than guessed.',
'2026-09-01T10:01:06.000Z',
'11111111-1111-4111-8111-111111111115',
NULL
),
(
'22222222-2222-4222-8222-222222222228',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'reply',
'The database should be the source of truth.',
'2026-09-01T10:01:07.000Z',
'11111111-1111-4111-8111-111111111116',
NULL
),
(
'22222222-2222-4222-8222-222222222229',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'reply',
'Cursor pagination is safer this way.',
'2026-09-01T10:01:08.000Z',
'11111111-1111-4111-8111-111111111117',
NULL
),
(
'22222222-2222-4222-8222-222222222230',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'reply',
'This is useful mentor evidence.',
'2026-09-01T10:01:09.000Z',
'11111111-1111-4111-8111-111111111118',
NULL
),
(
'22222222-2222-4222-8222-222222222231',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'reply',
'Transactions should be tested explicitly.',
'2026-09-01T10:01:10.000Z',
'11111111-1111-4111-8111-111111111119',
NULL
),
(
'22222222-2222-4222-8222-222222222232',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'reply',
'Looking forward to the SQL queries.',
'2026-09-01T10:01:11.000Z',
'11111111-1111-4111-8111-111111111120',
NULL
)
ON CONFLICT DO NOTHING;

-- =========================================================
-- REPOSTS — 4
-- =========================================================

INSERT INTO posts
(id, author_id, kind, text, created_at, reply_to_id, repost_of_id)
VALUES
(
'33333333-3333-4333-8333-333333333331',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'repost',
NULL,
'2026-09-01T10:02:00.000Z',
NULL,
'11111111-1111-4111-8111-111111111111'
),
(
'33333333-3333-4333-8333-333333333332',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'repost',
NULL,
'2026-09-01T10:02:01.000Z',
NULL,
'11111111-1111-4111-8111-111111111113'
),
(
'33333333-3333-4333-8333-333333333333',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'repost',
NULL,
'2026-09-01T10:02:02.000Z',
NULL,
'11111111-1111-4111-8111-111111111115'
),
(
'33333333-3333-4333-8333-333333333334',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'repost',
NULL,
'2026-09-01T10:02:03.000Z',
NULL,
'11111111-1111-4111-8111-111111111117'
)
ON CONFLICT DO NOTHING;

-- =========================================================
-- MEDIA — 10
-- =========================================================

INSERT INTO post_media
(id, post_id, position, small_url, large_url, width, height, alt_text)
VALUES
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
'11111111-1111-4111-8111-111111111111',
0,
'/fixtures/desk-480.jpg',
'/fixtures/desk-1200.jpg',
1200,
800,
'A desk with a laptop'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc',
'11111111-1111-4111-8111-111111111113',
0,
'/fixtures/code-480.jpg',
'/fixtures/code-1200.jpg',
1200,
800,
'Code displayed on a laptop'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd',
'11111111-1111-4111-8111-111111111114',
0,
'/fixtures/backend-480.jpg',
'/fixtures/backend-1200.jpg',
1200,
800,
'Backend architecture diagram'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbe',
'11111111-1111-4111-8111-111111111115',
0,
'/fixtures/database-480.jpg',
'/fixtures/database-1200.jpg',
1200,
800,
'Database diagram'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbf',
'11111111-1111-4111-8111-111111111117',
0,
'/fixtures/index-480.jpg',
'/fixtures/index-1200.jpg',
1200,
800,
'Database index illustration'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc0',
'11111111-1111-4111-8111-111111111119',
0,
'/fixtures/normalization-480.jpg',
'/fixtures/normalization-1200.jpg',
1200,
800,
'Relational normalization notes'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc1',
'11111111-1111-4111-8111-111111111121',
0,
'/fixtures/sql-480.jpg',
'/fixtures/sql-1200.jpg',
1200,
800,
'SQL query on a screen'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc2',
'11111111-1111-4111-8111-111111111123',
0,
'/fixtures/relations-480.jpg',
'/fixtures/relations-1200.jpg',
1200,
800,
'Relational database tables'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc3',
'11111111-1111-4111-8111-111111111125',
0,
'/fixtures/media-480.jpg',
'/fixtures/media-1200.jpg',
1200,
800,
'Ordered media examples'
),
(
'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbc4',
'11111111-1111-4111-8111-111111111131',
0,
'/fixtures/orm-480.jpg',
'/fixtures/orm-1200.jpg',
1200,
800,
'Database design before ORM modeling'
)
ON CONFLICT DO NOTHING;

-- =========================================================
-- LIKES — 15
-- =========================================================

INSERT INTO likes (user_id, post_id, created_at)
VALUES
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'11111111-1111-4111-8111-111111111111',
'2026-09-01T10:03:00.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'11111111-1111-4111-8111-111111111111',
'2026-09-01T10:03:01.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'11111111-1111-4111-8111-111111111111',
'2026-09-01T10:03:02.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'11111111-1111-4111-8111-111111111113',
'2026-09-01T10:03:03.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'11111111-1111-4111-8111-111111111113',
'2026-09-01T10:03:04.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'11111111-1111-4111-8111-111111111114',
'2026-09-01T10:03:05.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'11111111-1111-4111-8111-111111111115',
'2026-09-01T10:03:06.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'11111111-1111-4111-8111-111111111115',
'2026-09-01T10:03:07.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'11111111-1111-4111-8111-111111111117',
'2026-09-01T10:03:08.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'11111111-1111-4111-8111-111111111118',
'2026-09-01T10:03:09.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'11111111-1111-4111-8111-111111111119',
'2026-09-01T10:03:10.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'11111111-1111-4111-8111-111111111120',
'2026-09-01T10:03:11.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'11111111-1111-4111-8111-111111111121',
'2026-09-01T10:03:12.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'11111111-1111-4111-8111-111111111123',
'2026-09-01T10:03:13.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'11111111-1111-4111-8111-111111111124',
'2026-09-01T10:03:14.000Z'
)
ON CONFLICT DO NOTHING;

-- =========================================================
-- FOLLOWS — 8
-- =========================================================

INSERT INTO follows (follower_id, following_id, created_at)
VALUES
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'2026-09-01T10:04:00.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'2026-09-01T10:04:01.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'2026-09-01T10:04:02.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'2026-09-01T10:04:03.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'2026-09-01T10:04:04.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'2026-09-01T10:04:05.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'2026-09-01T10:04:06.000Z'
),
(
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac',
'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad',
'2026-09-01T10:04:07.000Z'
)
ON CONFLICT DO NOTHING;

COMMIT;
