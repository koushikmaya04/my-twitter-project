# PRD 03 — Seed Manifest

## Purpose

This manifest documents the deterministic seed data used by the PostgreSQL modeling database.

The seed uses fixed UUIDs and fixed UTC timestamps so that SQL queries and constraint tests can be reproduced consistently.

---

# 1. Seed Counts

| Entity | Expected Count |
|---|---:|
| Users | 6 |
| Original posts | 30 |
| Replies | 12 |
| Reposts | 4 |
| Media rows | 10 |
| Likes | 15 |
| Follow edges | 8 |

---

# 2. Users

| Handle | User ID |
|---|---|
| `asha` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` |
| `kiran` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab` |
| `meera` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac` |
| `rahul` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad` |
| `neha` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae` |
| `dev` | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf` |

---

# 3. Important Original Posts

## Original 1

```text
ID: 11111111-1111-4111-8111-111111111111
Author: asha
Created: 2026-09-01T10:00:00.000Z
```

Text:

```text
My first database-backed post
```

This post is used for:

- Like-count testing
- Reply-count testing
- Repost testing
- Media testing
- Post-detail testing

Expected:

```text
Like count: 3
Reply count: 3
```

---

## Original 2

```text
ID: 11111111-1111-4111-8111-111111111112
Author: kiran
Created: 2026-09-01T10:00:00.000Z
```

Text:

```text
A second post sharing the exact same timestamp
```

This post intentionally has the same timestamp as Original 1.

It is used to demonstrate deterministic cursor ordering using:

```text
(created_at, id)
```

---

## Original 29 — No Reactions

```text
ID: 11111111-1111-4111-8111-111111111139
Author: neha
Created: 2026-09-01T09:33:00.000Z
```

Text:

```text
This original intentionally has no reactions
```

Expected:

```text
Like count: 0
Reply count: 0
```

This record is used to verify that queries correctly return zero counts.

---

## Original 30

```text
ID: 11111111-1111-4111-8111-111111111140
Author: dev
Created: 2026-09-01T09:32:00.000Z
```

This record helps exercise the later feed pages.

---

# 4. Timestamp Tie

The following two originals have exactly the same timestamp:

```text
11111111-1111-4111-8111-111111111111
11111111-1111-4111-8111-111111111112
```

Timestamp:

```text
2026-09-01T10:00:00.000Z
```

Feed ordering is:

```text
created_at DESC,
id DESC
```

Therefore the ID is used as the deterministic tie-breaker.

This provides evidence that a timestamp-only cursor would not be sufficient.

---

# 5. Replies

There are 12 replies.

The first original has three direct replies:

```text
22222222-2222-4222-8222-222222222221
22222222-2222-4222-8222-222222222222
22222222-2222-4222-8222-222222222223
```

All three reference:

```text
11111111-1111-4111-8111-111111111111
```

The remaining replies reference other original posts.

Expected reply total:

```text
12
```

---

# 6. Reposts

There are 4 reposts:

| Repost ID | Repost Target |
|---|---|
| `33333333-3333-4333-8333-333333333331` | `11111111-1111-4111-8111-111111111111` |
| `33333333-3333-4333-8333-333333333332` | `11111111-1111-4111-8111-111111111113` |
| `33333333-3333-4333-8333-333333333333` | `11111111-1111-4111-8111-111111111115` |
| `33333333-3333-4333-8333-333333333334` | `11111111-1111-4111-8111-111111111117` |

All reposts have:

```text
text = NULL
reply_to_id = NULL
repost_of_id = NOT NULL
```

---

# 7. Media

Expected media rows:

```text
10
```

Media is attached only to original posts.

Every media item contains:

- Position
- Small URL
- Large URL
- Width
- Height
- Alt text

Positions use zero-based ordering:

```text
0–3
```

The shared API contract expects `smallUrl` and `largeUrl` variants for profile media. 

---

# 8. Likes

Expected total:

```text
15
```

Original 1 has exactly:

```text
3 likes
```

The three users are:

```text
kiran
meera
rahul
```

This provides a deterministic example for the like-total query.

The database primary key:

```text
(user_id, post_id)
```

prevents the same user from liking the same post twice.

---

# 9. Follows

Expected total:

```text
8
```

Asha's followers:

```text
kiran
meera
rahul
neha
dev
```

Therefore:

```text
Asha follower count = 5
```

Asha follows:

```text
kiran
```

Therefore:

```text
Asha following count = 1
```

These values can be used to verify the profile-statistics query.

---

# 10. User With No Media

The seed includes users whose original posts do not contain media.

This allows the profile-media query to be tested against a valid user with no matching media rows.

Expected behavior:

```text
existing user + no media
→ empty list
```

---

# 11. Reproducibility

The seed uses:

- Fixed UUIDs
- Fixed UTC timestamps
- Fixed relationships
- Fixed text values

The seed is intended to be rerunnable.

Inserts use:

```sql
ON CONFLICT DO NOTHING
```

so rerunning the seed does not duplicate logical rows.

The seed does not drop or reset the database automatically.

---

# 12. Verification Query

Run:

```sql
SELECT
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM posts WHERE kind = 'original') AS originals,
    (SELECT COUNT(*) FROM posts WHERE kind = 'reply') AS replies,
    (SELECT COUNT(*) FROM posts WHERE kind = 'repost') AS reposts,
    (SELECT COUNT(*) FROM post_media) AS media,
    (SELECT COUNT(*) FROM likes) AS likes,
    (SELECT COUNT(*) FROM follows) AS follows;
```

Expected:

```text
users | originals | replies | reposts | media | likes | follows
------+-----------+---------+---------+-------+-------+--------
  6   |    30     |   12    |    4    |  10   |  15   |   8
```

---

# 13. Known Query-Test Cases

The seed intentionally supports:

- Three distinct feed pages
- Timestamp tie
- A liked original
- An original with no reactions
- A user with no media
- Multiple replies
- Multiple reposts
- Following relationships
- Deterministic cursor pagination
- Empty-result testing