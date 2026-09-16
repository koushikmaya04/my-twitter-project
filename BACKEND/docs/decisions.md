# PRD 03 — Database Modeling Decisions

## 1. UUID Public Identifiers

All public entity identifiers use PostgreSQL `uuid`.

UUIDs are used for:

- Users
- Posts
- Post media

### Reason

UUIDs provide non-sequential public identifiers and keep the API independent of database-generated sequential IDs.

---

## 2. Timestamp Precision

All timestamps use:

```sql
timestamptz(3)
```

This intentionally provides millisecond precision.

Application timestamps are represented in UTC.

### Reason

The feed requires deterministic ordering and cursor pagination. Millisecond precision provides sufficient timestamp detail while keeping the representation explicit.

---

## 3. Normalized User Handles

The stored user handle represents the canonical normalized form.

The service layer is responsible for applying the handle format defined by the shared API contract.

The database guarantees uniqueness of the stored normalized value.

### Database responsibility

```sql
UNIQUE (handle)
```

The database should also prevent inconsistent casing if lowercase storage is selected.

---

## 4. Post Modeling

A single `posts` table represents three post kinds:

```text
original
reply
repost
```

The type is stored in:

```text
posts.kind
```

Relationships are represented using:

```text
reply_to_id
repost_of_id
```

### Original

```text
kind = original
reply_to_id = NULL
repost_of_id = NULL
text = 1–280 characters
```

### Reply

```text
kind = reply
reply_to_id = NOT NULL
repost_of_id = NULL
text = 1–280 characters
```

A reply target must be an original post.

### Repost

```text
kind = repost
reply_to_id = NULL
repost_of_id = NOT NULL
text = NULL
```

A repost target must be an original post.

---

## 5. Alternative Physical Model

One alternative is to use separate tables:

```text
posts
replies
reposts
```

### Why this was considered

Replies and reposts have different semantics:

- A reply contains new text.
- A repost contains no new text.
- Both reference another post.

### Selected model

Use one `posts` table with a `kind` column and nullable reference columns.

### Reason for selection

Replies and reposts are both posts from the application's perspective.

The unified model provides:

- One post identity
- One author relationship
- One creation timestamp
- One common feed representation
- Simpler common post queries
- Less duplicated schema
- Less duplicated relationship logic

Separate tables would require additional unions or duplicated logic when treating originals, replies, and reposts as posts.

---

## 6. Like Modeling

Likes are represented as a many-to-many relationship:

```text
users
  ↕
likes
  ↕
posts
```

The primary key is:

```sql
PRIMARY KEY (user_id, post_id)
```

### Reason

A user can like many posts, and a post can be liked by many users.

The composite primary key directly represents the relationship and prevents duplicate likes.

No separate like counter is stored on `posts`.

Like totals are derived from the `likes` table.

---

## 7. Follow Modeling

Follows are represented as a directional relationship between users:

```text
users
  ↕
follows
  ↕
users
```

The primary key is:

```sql
PRIMARY KEY (follower_id, following_id)
```

### Reason

The relationship is directional.

For example:

```text
Alice → Bob
```

is different from:

```text
Bob → Alice
```

The composite primary key prevents duplicate follow pairs.

Self-follow is prohibited:

```sql
CHECK (follower_id <> following_id)
```

---

## 8. Media Modeling

Post media is stored separately from posts:

```text
posts
  ↓
post_media
```

Each media item has a `position` value from:

```text
0
1
2
3
```

and:

```sql
UNIQUE (post_id, position)
```

### Reason

This keeps media as a separate one-to-many relationship and preserves ordering.

The combination of the position range and uniqueness constraint structurally limits a post to a maximum of four media rows.

Media is intended only for original posts.

The service layer validates that the parent post is an original.

---

## 9. Text Validation

Original and reply text must:

- Exist
- Be trimmed
- Contain at least 1 character
- Contain at most 280 characters

The database uses:

```sql
char_length(text)
```

for the length check.

Reposts must contain:

```text
text = NULL
```

### Reason

The requirement is based on characters rather than byte length, and PostgreSQL `text` supports Unicode content.

---

## 10. Cross-Row Validation

Some rules depend on another database row and therefore cannot be handled by a simple row-level `CHECK`.

Examples:

```text
reply target must be an original
repost target must be an original
media parent must be an original
```

These rules are enforced through service-layer lookup/validation.

The database still enforces the foreign key so that the referenced post must exist.

### Enforcement split

```text
Database
    ↓
PK / FK / UNIQUE / CHECK

Service
    ↓
Cross-row business rules

Transaction
    ↓
Multi-operation atomicity
```

Triggers are avoided unless a demonstrated requirement makes one necessary.

---

## 11. Repost Uniqueness

A user must not repost the same original more than once.

The schema enforces uniqueness using:

```text
author_id
repost_of_id
```

Because reposts require a non-null `repost_of_id`, the uniqueness rule prevents the same user from creating duplicate reposts of the same original.

---

## 12. Derived Counts

The schema does not store caller-controlled counters such as:

```text
like_count
reply_count
follower_count
following_count
```

These are derived from relational data.

Examples:

```text
like count
    → COUNT(*) FROM likes

follower count
    → COUNT(*) FROM follows

following count
    → COUNT(*) FROM follows
```

### Reason

The relationship rows are the source of truth.

Storing independent counters could allow the counter and actual rows to become inconsistent.

---

## 13. Foreign-Key Delete Policy

The following delete behavior is selected.

| Relationship | Delete Action | Reason |
|---|---|---|
| `posts.author_id → users.id` | `RESTRICT` | A post should not lose its required author |
| `posts.reply_to_id → posts.id` | `RESTRICT` | Referenced reply target should remain available |
| `posts.repost_of_id → posts.id` | `RESTRICT` | Referenced original should remain available |
| `post_media.post_id → posts.id` | `CASCADE` | Media has no independent meaning without its post |
| `likes.user_id → users.id` | `CASCADE` | User's like relationships disappear with the user |
| `likes.post_id → posts.id` | `CASCADE` | Likes have no meaning without the post |
| `follows.follower_id → users.id` | `CASCADE` | Follow relationship disappears with the user |
| `follows.following_id → users.id` | `CASCADE` | Follow relationship disappears with the user |

The selected behavior prevents accidental loss of referenced post relationships while allowing dependent relationship/media records to be cleaned up automatically where appropriate.

---

# 14. Normalization

## First Normal Form — 1NF

All fields contain atomic values.

The model does not store comma-separated lists such as:

```text
likes = "user1,user2,user3"
```

or:

```text
followers = "user1,user2,user3"
```

Instead, relationships are represented by separate rows in `likes` and `follows`.

---

## Second Normal Form — 2NF

Non-key attributes depend on the complete primary key.

For `likes`:

```sql
PRIMARY KEY (user_id, post_id)
```

The `created_at` value describes the complete user/post like relationship.

For `follows`:

```sql
PRIMARY KEY (follower_id, following_id)
```

The `created_at` value describes the complete follower/following relationship.

---

## Third Normal Form — 3NF

Data is stored with the entity it describes.

For example, author information is stored in:

```text
users
```

rather than duplicated inside every post.

The posts table stores:

```text
author_id
```

instead of copying:

```text
author_handle
author_display_name
```

Counts are also derived instead of duplicated as independent values.

---

# 15. Database Guarantees vs Application Guarantees

## Database guarantees

The database is responsible for guarantees such as:

- Primary keys
- Foreign keys
- Unique handles
- Unique likes
- Unique follows
- No self-follow
- Valid post kinds
- Post text length
- Repost text being NULL
- Valid media dimensions
- Valid media positions
- Non-empty media fields
- Maximum four media positions

## Application/service guarantees

The service layer is responsible for rules requiring related-row inspection:

- Reply target must be an original
- Repost target must be an original
- Media must belong to an original post
- Other business validation defined by the API contract

## Transaction guarantees

Transactions are used when multiple database operations must succeed or fail together.

---

# 16. ORM Decision

ORM models should not be created until the relational model has been reviewed.

The database design is the source of truth for:

- Tables
- Relationships
- Keys
- Constraints
- Indexes
- Delete behavior

The ORM should represent this design rather than determine it.