-- PRD 03 — PostgreSQL Relational Schema

-- =========================================================
-- 1. USERS
-- =========================================================

CREATE TABLE users (
    id UUID PRIMARY KEY,

    handle TEXT NOT NULL,

    display_name TEXT NOT NULL,

    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_handle_unique
        UNIQUE (handle),

    CONSTRAINT users_handle_normalized
        CHECK (handle = LOWER(BTRIM(handle))),

    CONSTRAINT users_handle_nonempty
        CHECK (BTRIM(handle) <> ''),

    CONSTRAINT users_display_name_nonempty
        CHECK (BTRIM(display_name) <> '')
);


-- =========================================================
-- 2. POSTS
-- =========================================================

CREATE TABLE posts (
    id UUID PRIMARY KEY,

    author_id UUID NOT NULL,

    kind TEXT NOT NULL,

    text TEXT,

    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    reply_to_id UUID,

    repost_of_id UUID,

    CONSTRAINT posts_author_fk
        FOREIGN KEY (author_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT posts_reply_to_fk
        FOREIGN KEY (reply_to_id)
        REFERENCES posts(id)
        ON DELETE RESTRICT,

    CONSTRAINT posts_repost_of_fk
        FOREIGN KEY (repost_of_id)
        REFERENCES posts(id)
        ON DELETE RESTRICT,

    CONSTRAINT posts_kind_check
        CHECK (
            kind IN ('original', 'reply', 'repost')
        ),

    CONSTRAINT posts_kind_relationship_check
        CHECK (
            (kind = 'original'
                AND reply_to_id IS NULL
                AND repost_of_id IS NULL)

            OR

            (kind = 'reply'
                AND reply_to_id IS NOT NULL
                AND repost_of_id IS NULL)

            OR

            (kind = 'repost'
                AND reply_to_id IS NULL
                AND repost_of_id IS NOT NULL)
        ),

    CONSTRAINT posts_text_check
        CHECK (
            (
                kind IN ('original', 'reply')
                AND text IS NOT NULL
                AND text = BTRIM(text)
                AND CHAR_LENGTH(text) BETWEEN 1 AND 280
            )
            OR
            (
                kind = 'repost'
                AND text IS NULL
            )
        )
);


-- =========================================================
-- 3. POST MEDIA
-- =========================================================

CREATE TABLE post_media (
    id UUID PRIMARY KEY,

    post_id UUID NOT NULL,

    position INTEGER NOT NULL,

    small_url TEXT NOT NULL,
    large_url TEXT NOT NULL,

    width INTEGER NOT NULL,

    height INTEGER NOT NULL,

    alt_text TEXT NOT NULL,

    CONSTRAINT post_media_post_fk
        FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE,

    CONSTRAINT post_media_position_check
        CHECK (position BETWEEN 0 AND 3),

    CONSTRAINT post_media_position_unique
        UNIQUE (post_id, position),

    CONSTRAINT post_media_width_check
        CHECK (width > 0),

    CONSTRAINT post_media_height_check
        CHECK (height > 0),

    CONSTRAINT post_media_small_url_check
    CHECK (BTRIM(small_url) <> ''),

    CONSTRAINT post_media_large_url_check
    CHECK (BTRIM(large_url) <> ''),

    CONSTRAINT post_media_alt_text_check
        CHECK (BTRIM(alt_text) <> '')
);


-- =========================================================
-- 4. LIKES
-- =========================================================

CREATE TABLE likes (
    user_id UUID NOT NULL,

    post_id UUID NOT NULL,

    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT likes_pk
        PRIMARY KEY (user_id, post_id),

    CONSTRAINT likes_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT likes_post_fk
        FOREIGN KEY (post_id)
        REFERENCES posts(id)
        ON DELETE CASCADE
);


-- =========================================================
-- 5. FOLLOWS
-- =========================================================

CREATE TABLE follows (
    follower_id UUID NOT NULL,

    following_id UUID NOT NULL,

    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT follows_pk
        PRIMARY KEY (follower_id, following_id),

    CONSTRAINT follows_follower_fk
        FOREIGN KEY (follower_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT follows_following_fk
        FOREIGN KEY (following_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT follows_no_self_follow
        CHECK (follower_id <> following_id)
);


-- =========================================================
-- 6. REPOST UNIQUENESS
-- =========================================================

CREATE UNIQUE INDEX posts_unique_user_repost
    ON posts (author_id, repost_of_id)
    WHERE kind = 'repost';


-- =========================================================
-- 7. FEED / QUERY ACCESS-PATH INDEXES
-- =========================================================

CREATE INDEX posts_feed_idx
    ON posts (created_at DESC, id DESC);

CREATE INDEX posts_author_feed_idx
    ON posts (author_id, created_at DESC, id DESC);

CREATE INDEX posts_reply_idx
    ON posts (reply_to_id, created_at DESC, id DESC);

CREATE INDEX posts_repost_idx
    ON posts (repost_of_id, created_at DESC, id DESC);

CREATE INDEX likes_post_idx
    ON likes (post_id);

CREATE INDEX follows_following_idx
    ON follows (following_id);