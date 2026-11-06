# JS-P0-07 — Permission Matrix

**Project:** `my-twitter-project` — Backend  
**Purpose:** Record the authentication and authorization contract for API routes and provide evidence that allowed and denied requests behave as expected.  
**Status:** Completed & Verified  
**Last updated:** 2026-11-06  

## 1. Decision rules

- **Anonymous** means no valid session cookie is supplied.
- **Authenticated user** means the session is valid, unexpired, not revoked, and belongs to an active account.
- **Owner** means the authenticated user owns the resource being changed or read privately.
- **Other user** means a different authenticated account. “Related” does not automatically grant permission to mutate another user's resource.
- Public read access remains public where the product requirements allow it; public endpoints do not require authentication.
- Every mutation derives the acting user ID strictly from the authenticated request/session (`SessionGuard` attaching `request.user`), never from a client-supplied `userId`, `ownerId`, or equivalent field.
- Reject unknown fields and validate IDs, pagination, and payload bounds consistently.
- For each denied request, the expected status, actual status, request ID, and automated test evidence are verified. Never include passwords, cookies, raw session tokens, or secrets in evidence or logs.

## 2. Route permission matrix

| Area | Route / operation | Anonymous | Resource owner / current user | Other authenticated user | Expected denial / evidence to verify | Status |
|---|---|---|---|---|---|---|
| Authentication | `POST /auth/register` | Allow valid registration | Allow | Allow | Invalid body → 400; duplicate normalized handle → 409 Conflict; no password/hash leakage | Verified |
| Authentication | `POST /auth/login` | Allow valid credentials | Allow | Allow | Invalid credentials → generic 401; no account enumeration; no token in response body/logs | Verified |
| Authentication | `GET /auth/me` | Deny (401) | Allow with valid session | Only returns caller's own identity | Missing/invalid/expired/revoked session → 401; request ID present | Verified |
| Authentication | `POST /auth/logout` | 200 OK (idempotent, clears cookie) | Allow own-session logout | Only affects the supplied session | Does not revoke another user's session; cookie is cleared consistently | Verified |
| Authentication | `POST /auth/deactivate` | Deny (401) | Allow deactivation of own account | Deny deactivation of another account | Unauthenticated → 401; active sessions revoked; subsequent use of old session denied | Verified |
| Sessions | `GET /auth/sessions` | Deny (401) | Allow (lists own active device sessions) | Denied access to other accounts' sessions | Scoped strictly to authenticated viewer; enriched with device details and `isCurrent` | Verified |
| Sessions | `DELETE /auth/sessions/:id` | Deny (401) | Allow (revokes own session) | Deny (404/403 for other user's session) | Cross-user revocation fails safely; revoking current session clears cookie | Verified |
| Sessions | `POST /auth/sessions/revoke-others` | Deny (401) | Allow (bulk-revokes other devices) | Deny | Revokes only secondary sessions of caller; current active session stays valid | Verified |
| Profile | `GET /users/:id` (public profile) | Allow | Allow | Allow public fields only | Deactivated accounts return 404; private fields excluded from response | Verified |
| Profile | `PATCH /users/:id` (update profile) | Deny (401) | Allow own profile (allowed fields) | Deny changes to another user's profile (403) | Cross-account update denied; immutable/unknown fields rejected; invalid bio → 400 | Verified |
| Profile | `GET /users/:id/followers` | Allow | Allow | Allow | Bounded cursor pagination; deactivated users omitted | Verified |
| Profile | `GET /users/:id/following` | Allow | Allow | Allow | Bounded cursor pagination; deactivated users omitted | Verified |
| Follow | `POST /users/:id/follow` | Deny (401) | Cannot self-follow (422) | Allow following another active account | Self-follow rejected; duplicate follow is idempotent (`ON CONFLICT DO NOTHING`) | Verified |
| Follow | `DELETE /users/:id/follow` | Deny (401) | Allow unfollowing | Cannot mutate another follower's relationship | Idempotent desired-state unfollow; leaves database consistent | Verified |
| Feed | `GET /feed` (public feed) | Allow | Allow | Allow | Returns public originals; bounded pagination; backward-compatible | Verified |
| Feed | `GET /feed/home` (home feed) | Deny (401) | Allow (own posts + followed active accounts) | Scoped strictly to caller's graph | Anonymous → 401; empty onboarding state supported; keyset cursor stable on ties | Verified |
| Search | `GET /search` | Allow | Allow | Allow public results only | Bounded length; SQL injection protected; deleted/deactivated content excluded | Verified |
| Posts | `POST /posts` (create post) | Deny (401) | Allow; author ID derived from session | Allow as self, cannot forge author | Missing session → 401; client cannot specify author ID; text length 1–280 enforced | Verified |
| Posts | `GET /posts/:id` (post detail) | Allow | Allow | Allow | Deleted posts hidden or 404; malformed UUID → 400 | Verified |
| Posts | `GET /posts/:id/replies` | Allow | Allow | Allow | Cursor/limit bounded; replies to deleted posts handled cleanly | Verified |
| Posts | `PATCH /posts/:id` (edit post) | Deny (401) | Allow within 30m window & matching version | Deny (403/404) | Non-owner → 403; edit after 30m → 400/422; version conflict → 409 Conflict | Verified |
| Posts | `DELETE /posts/:id` (delete post) | Deny (401) | Allow own post (soft-delete) | Deny (403) | Non-owner → 403; repeated delete idempotent; soft-deleted from feeds & detail | Verified |
| Likes | `POST /posts/:id/like` | Deny (401) | Allow as self | Allow as self | In-transaction notification to author; duplicate like idempotent | Verified |
| Likes | `DELETE /posts/:id/like` | Deny (401) | Allow removing own like | Cannot remove another user's like | Idempotent unlike; count updated accurately | Verified |
| Reposts | `POST /posts/:id/repost` | Deny (401) | Allow as self | Allow as self | Target must be active original post; author receives notification atomically | Verified |
| Notifications | `GET /notifications` | Deny (401) | Allow own inbox | Deny access to another user's inbox | Recipient scoping strictly enforced; paginated newest-first | Verified |
| Notifications | `GET /notifications/unread-count` | Deny (401) | Allow own unread count | Deny access to another user's count | Recipient-scoped; accurately reflects unread rows; excludes deleted posts | Verified |
| Notifications | `POST /notifications/read-all` | Deny (401) | Allow marking own notifications read | Cannot mark another user's notifications | Uses snapshot cutoff timestamp (`created_at <= cutoff`) to isolate concurrent events | Verified |
| Notifications | `PATCH /notifications/:id/read` | Deny (401) | Allow marking own notification read | Deny modifying another recipient's notification (403/404) | Cross-recipient ID cannot mutate state; idempotent | Verified |
| Health | `GET /health` | Allow (200 OK) | Allow | Allow | Exposes no sensitive secrets, environment values, or internal details | Verified |

## 3. Required negative tests

- [x] Every protected route rejects a missing session with 401 Unauthorized.
- [x] Invalid, expired, and revoked sessions are rejected by `SessionGuard`.
- [x] A user cannot update or deactivate another account (`403 Forbidden`).
- [x] A user cannot edit or delete another user's post (`403 Forbidden`).
- [x] A user cannot create a post, like, follow, repost, or notification action on behalf of another user by injecting an actor/owner ID.
- [x] A user cannot read or mutate another user's notification inbox or read state.
- [x] Unknown fields are rejected, not silently accepted, for mutation DTOs (`ValidationPipe`).
- [x] Invalid UUIDs/IDs and oversized page limits are rejected safely with standardized 400 Bad Request.
- [x] Deactivated accounts and soft-deleted posts obey the documented visibility contract across feed, search, replies, and notifications.
- [x] Repeated requests, concurrent requests, and retries cannot bypass authorization or create invalid duplicate state.

## 4. Evidence log

| Date | Finding / scenario | Test or evidence reference | Result | Follow-up issue / decision |
|---|---|---|---|---|
| 2026-11-06 | Missing session rejected on protected routes | `test/app.e2e-spec.ts` | 401 Unauthorized (`req-auth-001`) | Passed; verified across all routes |
| 2026-11-06 | Cross-user profile modification denied | `src/users/users.controller.spec.ts` | 403 Forbidden (`req-prof-002`) | Passed; database record untouched |
| 2026-11-06 | Cross-user post edit / delete denied | `test/social-feed.integration.spec.ts` | 403 Forbidden (`req-post-003`) | Passed; non-author edit rejected |
| 2026-11-06 | Post edit window expired (> 30 min) | `test/social-feed.integration.spec.ts` | 400 Bad Request (`req-post-004`) | Passed; 30-minute deadline enforced |
| 2026-11-06 | Stale version optimistic concurrency edit | `test/social-feed.integration.spec.ts` | 409 Conflict (`req-post-005`) | Passed; version mismatch rejected |
| 2026-11-06 | Cross-user notification read mutation | `test/notifications.integration.spec.ts` | 404 / 403 (`req-notif-006`) | Passed; other recipient unaffected |
| 2026-11-06 | Duplicate follow / like concurrency | `db/transaction-tests.sql` | 1 active row (`req-graph-007`) | Passed; idempotency guaranteed |
| 2026-11-06 | Multi-device session revocation | `test/device-detection-and-audit.spec.ts` | 200 OK / Cookie cleared | Passed; selective & bulk revoke verified |

## 5. Release sign-off

- [x] Every controller route has an entry in this matrix.
- [x] Every mutation has an explicit authentication and authorization decision.
- [x] Public routes are explicitly identified and justified by the product contract.
- [x] Owner, related-user, unrelated-user, and anonymous cases are tested where applicable.
- [x] No row is unverified; all rows backed by current code and test evidence.
- [x] All compatibility exceptions and known limitations have decision records (Decisions 01–08).
- [x] Security findings are fixed or explicitly accepted.
- [x] Matrix reviewed and approved for release.
