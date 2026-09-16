# PRD 03 — Data Dictionary

## Purpose

This document defines the columns, PostgreSQL types, nullability, defaults, keys, constraints, and example values for the relational model.

---

# 1. Users

| Column | Logical Meaning | PostgreSQL Type | Required / Nullable | Default | Key / Constraint | Example |
|---|---|---|---|---|---|---|
| `id` | Unique public identifier for the user | `uuid` | Required / NOT NULL | None | Primary Key | `550e8400-e29b-41d4-a716-446655440000` |
| `handle` | User's canonical normalized handle | `text` | Required / NOT NULL | None | UNIQUE; normalized/lowercase policy | `alice` |
| `display_name` | User's display name | `text` | Required / NOT NULL | None | — | `Alice` |
| `created_at` | Time the user was created | `timestamptz(3)` | Required / NOT NULL | Current timestamp | — | `2026-01-01T10:00:00.000Z` |

### Handle policy

The stored handle represents the canonical normalized form.

The service layer is responsible for applying the handle format defined by the shared API contract.

The database must guarantee uniqueness of the stored normalized value.

---

# 2. Posts

| Column | Logical Meaning | PostgreSQL Type | Required / Nullable | Default | Key / Constraint | Example |
|---|---|---|---|---|---|---|
| `id` | Unique public identifier for the post | `uuid` | Required / NOT NULL | None | Primary Key | `650e8400-e29b-41d4-a716-446655440001` |
| `author_id` | User who authored the post | `uuid` | Required / NOT NULL | None | FK → `users.id` | User UUID |
| `kind` | Type of post | `text` | Required / NOT NULL | None | `original`, `reply`, or `repost` | `original` |
| `text` | Text content of an original or reply | `text` | Nullable | None | 1–280 characters for original/reply; NULL for repost | `Hello world` |
| `created_at` | Time the post was created | `timestamptz(3)` | Required / NOT NULL | Current timestamp | — | `2026-01-01T10:00:00.000Z` |
| `reply_to_id` | Original post being replied to | `uuid` | Nullable | None | FK → `posts.id` | Post UUID |
| `repost_of_id` | Original post being reposted | `uuid` | Nullable | None | FK → `posts.id` | Post UUID |

### Post kind rules

#### Original

```text
kind = original
reply_to_id = NULL
repost_of_id = NULL
text = 1–280 characters
```

#### Reply

```text
kind = reply
reply_to_id = NOT NULL
repost_of_id = NULL
text = 1–280 characters
```

The referenced reply target must be an original post.

#### Repost

```text
kind = repost
reply_to_id = NULL
repost_of_id = NOT NULL
text = NULL
```

The referenced repost target must be an original post.

---

# 3. Post Media

| Column | Logical Meaning | PostgreSQL Type | Required / Nullable | Default | Key / Constraint | Example |
|---|---|---|---|---|---|---|
| `id` | Unique identifier for the media item | `uuid` | Required / NOT NULL | None | Primary Key | Media UUID |
| `post_id` | Post that owns the media | `uuid` | Required / NOT NULL | None | FK → `posts.id` | Post UUID |
| `position` | Ordering of media within the post | `integer` | Required / NOT NULL | None | Range `0–3`; UNIQUE per post | `0` |
| `url` | Media URL | `text` | Required / NOT NULL | None | Must be non-empty | `https://example.com/image.jpg` |
| `width` | Image width in pixels | `integer` | Required / NOT NULL | None | Must be greater than 0 | `1200` |
| `height` | Image height in pixels | `integer` | Required / NOT NULL | None | Must be greater than 0 | `800` |
| `alt_text` | Alternative text describing the image | `text` | Required / NOT NULL | None | Must be non-empty | `A person standing outdoors` |

### Media rules

Media belongs only to original posts.

Each post can have positions:

```text
0
1
2
3
```

The combination of:

```text
position BETWEEN 0 AND 3
```

and:

```text
UNIQUE(post_id, position)
```

provides a maximum of four media rows per post.

---

# 4. Likes

| Column | Logical Meaning | PostgreSQL Type | Required / Nullable | Default | Key / Constraint | Example |
|---|---|---|---|---|---|---|
| `user_id` | User who liked the post | `uuid` | Required / NOT NULL | None | PK + FK → `users.id` | User UUID |
| `post_id` | Post that was liked | `uuid` | Required / NOT NULL | None | PK + FK → `posts.id` | Post UUID |
| `created_at` | Time the like was created | `timestamptz(3)` | Required / NOT NULL | Current timestamp | — | `2026-01-01T10:05:00.000Z` |

### Primary Key

```sql
PRIMARY KEY (user_id, post_id)
```

This represents the relationship directly and prevents the same user from liking the same post more than once.

No separate public `id` is required because likes are association records rather than independently addressed resources.

---

# 5. Follows

| Column | Logical Meaning | PostgreSQL Type | Required / Nullable | Default | Key / Constraint | Example |
|---|---|---|---|---|---|---|
| `follower_id` | User performing the follow | `uuid` | Required / NOT NULL | None | PK + FK → `users.id` | User UUID |
| `following_id` | User being followed | `uuid` | Required / NOT NULL | None | PK + FK → `users.id` | User UUID |
| `created_at` | Time the follow relationship was created | `timestamptz(3)` | Required / NOT NULL | Current timestamp | — | `2026-01-01T10:10:00.000Z` |

### Primary Key

```sql
PRIMARY KEY (follower_id, following_id)
```

This represents the directional relationship directly and prevents duplicate follow pairs.

A separate public `id` is not required because follows are association records rather than independently addressed resources.

Self-follow is prohibited:

```text
follower_id <> following_id
```

---

# 6. Identifier Policy

All public entity identifiers use:

```text
uuid
```

This applies to:

- Users
- Posts
- Post media

Association tables use their relationship columns as composite primary keys where appropriate.

---

# 7. Timestamp Policy

All timestamps use:

```text
timestamptz(3)
```

The precision is intentional so that timestamps retain millisecond precision.

Application timestamps are represented in UTC.

---

# 8. Text Policy

Post text is stored using PostgreSQL:

```text
text
```

Original and reply text must contain between 1 and 280 characters after trimming.

Reposts must have:

```text
text = NULL
```

Unicode text is supported.

---

# 9. Derived Counts

The model does not store caller-controlled counters such as:

```text
like_count
reply_count
follower_count
following_count
```

These values are derived from the corresponding relational rows.

For example:

```sql
COUNT(*) FROM likes
```

is the source of truth for a post's like count.

This prevents cached counters from silently disagreeing with the underlying relationships.