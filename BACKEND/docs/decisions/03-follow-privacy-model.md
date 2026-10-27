# Decision 03 — Follow Model and Account Privacy

**Status:** Recorded from the P0-03 implementation and the previously selected product scope  
**Feature:** JS-P0-03 — Follow graph and privacy

## Decision

Use **public accounts only** for this increment. Following and unfollowing are immediate, desired-state operations. There is no private-account follow-request workflow in P0-03. A member follows another member by creating one relationship row; unfollowing removes that relationship.

The authenticated session determines the follower. The target user ID comes from the route parameter and is validated by the API.

## Options considered

- **Selected:** Public accounts only; immediate follow/unfollow.
- Support private accounts with pending/accepted/rejected/cancelled follow-request states.
- Implement follow as a toggle that reverses state on every request.

## Why this decision

The public-only scope avoids introducing a follow-request state machine before it is required. Desired-state operations are retry-safe: repeating “follow” should leave the relationship active, and repeating “unfollow” should leave it absent. The authenticated actor must not be selected by client-supplied identity fields.

The database enforces relationship uniqueness with a composite primary key on `(follower_id, following_id)` and prevents self-follow with a check constraint. Indexes support follower/following relationship-list access and ordering.

## Implementation references

- `src/users/users.controller.ts`
  - `POST /users/:id/follow`
  - `DELETE /users/:id/follow`
  - `GET /users/:id/followers`
  - `GET /users/:id/following`
- `src/users/users.service.ts` — delegates follow state and relationship-list operations to the repository.
- `src/database/schema/follows.ts` — composite primary key, no-self-follow check, and relationship-list indexes.
- `src/data/repository/drizzle-social-feed.repository.ts` — persistence behavior for follow state and paginated lists.

## Invariants

- The authenticated user is the follower; the request cannot nominate a different follower.
- A user cannot follow themselves.
- One follower/following pair can have at most one relationship row.
- Follow and unfollow express desired state, not a toggle.
- Relationship lists are bounded and cursor-paginated.
- Deactivated or nonexistent accounts must not become usable relationship targets.
- Counts must reflect the active relationship model consistently.

## Risks and limitations

- Private accounts and pending follow requests are intentionally not supported by this decision.
- Privacy enforcement must not be claimed complete unless every applicable read surface is tested.
- Count consistency and concurrent duplicate requests require repository/integration tests, not only TypeScript checks.
- Cursor pagination must remain deterministic when timestamps tie.

## Tests proving it

Link or add tests for:
- Unauthenticated follow/unfollow is rejected.
- Self-follow is rejected and leaves the database unchanged.
- Repeating follow or unfollow converges to the requested state.
- Concurrent duplicate follow requests create at most one relationship.
- Invalid, nonexistent, and deactivated targets fail safely.
- Followers/following pagination is bounded, deterministic, and has no duplicate rows across pages.
- Relationship counts match the persisted active relationships.

## Review note

This record reflects the selected public-only design and the inspected route/schema structure. Before marking P0-03 fully accepted, verify that every invariant above has a passing test and that read-surface privacy behavior matches the actual product scope.
