# Decision 04 — Personalized Home Feed and Pagination

**Status:** Recorded from the P0-04 implementation  
**Feature:** JS-P0-04 — Personalized home feed

## Decision

Keep the existing public feed available at `GET /feed` for compatibility. Add a session-protected personalized home feed at `GET /feed/home`.

The home feed includes original posts authored by the authenticated viewer and by accounts the viewer currently follows. Replies and reposts are excluded from the home-feed result set. The viewer ID is derived from verified session state, not from request parameters.

Use deterministic keyset pagination ordered by `(created_at DESC, id DESC)`. The cursor carries both the timestamp and post ID so records with equal timestamps can still be ordered consistently.

## Options considered

- **Selected:** Separate public feed and authenticated personalized home feed.
- Replace the existing public feed contract with a personalized feed.
- Use offset pagination or a timestamp-only cursor.
- Include replies and reposts in the home-feed result set.

## Why this decision

Keeping `GET /feed` avoids silently changing the V1 public-feed contract. A separate authenticated route makes the viewer context explicit. Including the viewer's own originals prevents a home feed from excluding their own posts. Tuple-based keyset pagination gives stable ordering when timestamps tie and avoids the shifting-row behavior associated with offset pagination.

The repository uses Drizzle ORM and PostgreSQL, so this implementation should continue using the existing repository abstraction rather than introducing a parallel persistence stack.

## Implementation references

- `src/feed/feed.controller.ts`
  - `GET /feed` — public feed.
  - `GET /feed/home` — protected by `SessionGuard`; uses `request.user.id`.
- `src/feed/feed.service.ts` — delegates to `listOriginalFeed` or `listHomeFeed`.
- `src/data/repository/drizzle-social-feed.repository.ts` — personalized author eligibility, tuple cursor, descending ordering, and batched post hydration.
- `src/database/schema/posts.ts` — feed ordering index.
- `src/common/cursor-validation/feed-query.validation.ts` and cursor validation utilities — query/cursor validation.

## Invariants

- Only original posts are included in the home-feed result set.
- Eligible authors are the viewer and accounts the viewer currently follows.
- Deactivated authors are excluded by the repository query.
- The viewer is derived from the authenticated session.
- Ordering is deterministic: `createdAt DESC`, then `id DESC`.
- Pagination is bounded and uses a cursor containing both ordering fields.
- Existing public-feed behavior remains available.
- Eligibility changes between page requests are evaluated on later requests; this is not a snapshot-consistent multi-page feed.

## Empty-feed behavior

The repository returns an empty page when the viewer has no eligible posts. Do not silently substitute public posts as a fallback. The client should render an intentional empty/onboarding state when `items` is empty. This policy should be documented in the API/client contract.

## Risks and limitations

- A follow/unfollow or account-state change between pages can change which posts are eligible. The cursor does not promise a frozen snapshot.
- Cursor validation must reject malformed timestamps and IDs safely.
- Query count and latency should be measured with representative data; batched hydration alone is not proof of a query budget.
- Privacy requirements must be enforced consistently on all relevant routes, not only on the home-feed query.

## Tests proving it

Link or add tests for:
- Anonymous access to `/feed/home` is rejected.
- Authenticated viewer's own original posts appear.
- Originals from followed active accounts appear.
- Unfollowed and deactivated authors are excluded.
- Replies and reposts are excluded.
- Equal timestamps paginate without duplicates when eligibility is unchanged.
- Empty-feed response is intentional and stable.
- Query count does not grow linearly with page size.

## Review note

The inspected home-feed query implements self/followed-author eligibility and `(createdAt, id)` cursor ordering. Before marking P0-04 accepted, verify privacy rules, empty-state behavior, query-count budgets, and regression tests against the PRD.
