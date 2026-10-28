# PRD 03 — Query Plan Report

## Purpose

This report records actual PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`
results for two representative read queries.

The comparisons were performed before and after the candidate indexes
were created. The results below are the actual outputs captured from the
database.

No unsupported performance claims are made.

---

# 1. Home Feed Query

## SQL

```sql
SELECT
    p.id,
    p.author_id,
    p.kind,
    p.text,
    p.created_at
FROM posts p
ORDER BY p.created_at DESC, p.id DESC
LIMIT 10;
```

## Before Candidate Index

### Actual PostgreSQL Output

```text
"Limit  (cost=25.49..25.51 rows=10 width=104) (actual time=0.179..0.184 rows=10.00 loops=1)"
"  Buffers: shared hit=7"
"  ->  Sort  (cost=25.49..26.71 rows=490 width=104) (actual time=0.176..0.178 rows=10.00 loops=1)"
"        Sort Key: created_at DESC, id DESC"
"        Sort Method: top-N heapsort  Memory: 26kB"
"        Buffers: shared hit=7"
"        ->  Seq Scan on posts p  (cost=0.00..14.90 rows=490 width=104) (actual time=0.042..0.058 rows=46.00 loops=1)"
"              Buffers: shared hit=1"
"Planning:"
"  Buffers: shared hit=32 dirtied=2"
"Planning Time: 2.584 ms"
"Execution Time: 0.244 ms"
```

### Observation

The query used:

```text
Seq Scan → Sort → Limit
```

The sort used a top-N heapsort.

Measured execution time:

```text
0.244 ms
```

Shared buffer hits:

```text
7
```

---

## Candidate Index

```sql
CREATE INDEX posts_feed_idx
ON posts (created_at DESC, id DESC);
```

The index matches the feed ordering:

```text
created_at DESC, id DESC
```

---

## After Candidate Index

### Actual PostgreSQL Output

```text
"Limit  (cost=2.45..2.48 rows=10 width=104) (actual time=0.056..0.057 rows=10.00 loops=1)"
"  Buffers: shared hit=1"
"  ->  Sort  (cost=2.45..2.57 rows=46 width=104) (actual time=0.054..0.055 rows=10.00 loops=1)"
"        Sort Key: created_at DESC, id DESC"
"        Sort Method: top-N heapsort  Memory: 26kB"
"        Buffers: shared hit=1"
"        ->  Seq Scan on posts p  (cost=0.00..1.46 rows=46 width=104) (actual time=0.025..0.031 rows=46.00 loops=1)"
"              Buffers: shared hit=1"
"Planning Time: 0.161 ms"
"Execution Time: 0.080 ms"
```

### Observation

The query still used:

```text
Seq Scan → Sort → Limit
```

The `posts_feed_idx` index was not used for this execution.

The sort remained a top-N heapsort.

Measured execution time changed from:

```text
0.244 ms → 0.080 ms
```

Shared buffer hits changed from:

```text
7 → 1
```

Because the seed dataset is small, PostgreSQL continued to prefer a
sequential scan.

The measured result should not be treated as a production-scale
benchmark or proof of a fixed speedup.

---

# 2. User Posts Query

## SQL

```sql
SELECT
    p.id,
    p.author_id,
    p.kind,
    p.text,
    p.created_at
FROM posts p
WHERE p.author_id =
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
ORDER BY p.created_at DESC, p.id DESC
LIMIT 10;
```

## Before Candidate Index

### Actual PostgreSQL Output

```text
"Limit  (cost=1.59..1.59 rows=1 width=104) (actual time=0.069..0.072 rows=7.00 loops=1)"
"  Buffers: shared hit=1"
"  ->  Sort  (cost=1.59..1.59 rows=1 width=104) (actual time=0.068..0.068 rows=7.00 loops=1)"
"        Sort Key: created_at DESC, id DESC"
"        Sort Method: quicksort  Memory: 25kB"
"        Buffers: shared hit=1"
"        ->  Seq Scan on posts p  (cost=0.00..1.58 rows=1 width=104) (actual time=0.027..0.034 rows=7.00 loops=1)"
"              Filter: (author_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)"
"              Rows Removed by Filter: 39"
"              Buffers: shared hit=1"
"Planning:"
"  Buffers: shared hit=7"
"Planning Time: 1.314 ms"
"Execution Time: 0.164 ms"
```

### Observation

The query used:

```text
Seq Scan → Sort → Limit
```

The sequential scan returned 7 matching rows and removed 39 rows using
the `author_id` filter.

Measured execution time:

```text
0.164 ms
```

Shared buffer hits:

```text
1
```

---

## Candidate Index

```sql
CREATE INDEX posts_author_feed_idx
ON posts (author_id, created_at DESC, id DESC);
```

The index places the equality-filtered `author_id` first, followed by
the columns required for deterministic ordering.

---

## After Candidate Index

### Actual PostgreSQL Output

```text
"Limit  (cost=1.59..1.59 rows=1 width=104) (actual time=0.104..0.107 rows=7.00 loops=1)"
"  Buffers: shared hit=1"
"  ->  Sort  (cost=1.59..1.59 rows=1 width=104) (actual time=0.102..0.104 rows=7.00 loops=1)"
"        Sort Key: created_at DESC, id DESC"
"        Sort Method: quicksort  Memory: 25kB"
"        Buffers: shared hit=1"
"        ->  Seq Scan on posts p  (cost=0.00..1.58 rows=1 width=104) (actual time=0.075..0.083 rows=7.00 loops=1)"
"              Filter: (author_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid)"
"              Rows Removed by Filter: 39"
"              Buffers: shared hit=1"
"Planning:"
"  Buffers: shared hit=23 read=1"
"Planning Time: 4.780 ms"
"Execution Time: 0.142 ms"
```

### Observation

The query still used:

```text
Seq Scan → Sort → Limit
```

The `posts_author_feed_idx` index was not used for this execution.

The measured execution time changed from:

```text
0.164 ms → 0.142 ms
```

Shared buffer hits remained:

```text
1
```

Planning time changed from:

```text
1.314 ms → 4.780 ms
```

Because the seed dataset is small, PostgreSQL continued to prefer a
sequential scan.

The small execution-time difference should not be presented as a
meaningful production performance improvement.

---

# 3. Query Plan Comparison

## Home Feed

| Metric | Before | After |
|---|---:|---:|
| Scan | Sequential Scan | Sequential Scan |
| Index used | No | No |
| Sort | Top-N heapsort | Top-N heapsort |
| Rows returned | 10 | 10 |
| Shared buffer hits | 7 | 1 |
| Execution time | 0.244 ms | 0.080 ms |
| Planning time | 2.584 ms | 0.161 ms |

### Conclusion

The candidate index did not change the selected scan strategy. PostgreSQL
continued to use a sequential scan and top-N heapsort.

The measured execution time was lower in the after-index execution, but
the dataset is small and the index was not used. Therefore this result
should not be interpreted as a general production-scale speedup.

---

## User Posts

| Metric | Before | After |
|---|---:|---:|
| Scan | Sequential Scan | Sequential Scan |
| Index used | No | No |
| Sort | Quicksort | Quicksort |
| Rows returned | 7 | 7 |
| Rows removed by filter | 39 | 39 |
| Shared buffer hits | 1 | 1 |
| Shared buffer reads | 0 | 1 |
| Execution time | 0.164 ms | 0.142 ms |
| Planning time | 1.314 ms | 4.780 ms |

### Conclusion

The candidate index did not change the selected execution plan.
PostgreSQL continued to use a sequential scan followed by a sort.

The execution time was slightly lower in the after-index execution, but
the difference is too small and the index was not used. No meaningful
performance improvement is claimed.

---

# 4. Existing Indexes

The schema contains indexes for important access patterns:

```sql
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
```

The schema also has primary-key and unique constraints that require
supporting indexes.

The partial unique repost index is:

```sql
CREATE UNIQUE INDEX posts_unique_user_repost
ON posts (author_id, repost_of_id)
WHERE kind = 'repost';
```

---

# 5. Dataset Size Note

The deterministic seed dataset is intentionally small.

With a small table, PostgreSQL may choose a sequential scan even when a
suitable index exists because scanning the table can be cheaper than
performing an index lookup.

Therefore:

```text
index exists ≠ index must be used
```

The report records the actual plans chosen by PostgreSQL.

---

# 6. Final Summary

Two representative read queries were tested:

1. Home feed
2. User's posts

For each query, actual `EXPLAIN (ANALYZE, BUFFERS)` output was captured
before and after the candidate index.

The observed plans show that PostgreSQL continued to use sequential scans
for both queries with the current small seed dataset.

The indexes remain appropriate for the intended access patterns:

- `posts_feed_idx` supports feed ordering and cursor pagination.
- `posts_author_feed_idx` supports filtering by author and deterministic
  ordering.

No unsupported production-scale performance claims are made.
