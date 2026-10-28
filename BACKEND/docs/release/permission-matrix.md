# JS-P0-07 — Permission Matrix

**Project:** `my-twitter-project` — Backend  
**Purpose:** Record the authentication and authorization contract for API routes and provide evidence that allowed and denied requests behave as expected.  
**Status:** Initial review draft. Rows must not be marked verified until the current controller, guard, service/repository behavior, and tests have been checked on the P0-07 branch.

## 1. Decision rules

- **Anonymous** means no valid session cookie is supplied.
- **Authenticated user** means the session is valid, unexpired, not revoked, and belongs to an active account.
- **Owner** means the authenticated user owns the resource being changed or read privately.
- **Other user** means a different authenticated account. “Related” does not automatically grant permission to mutate another user's resource.
- Public read access should remain public where the product requirements allow it; do not add authentication to public routes without a documented product/security reason.
- Every mutation must derive the acting user ID from the authenticated request/session, not from a client-supplied `userId`, `ownerId`, or equivalent field.
- Reject unknown fields and validate IDs, pagination, and payload bounds consistently.
- For each denied request, capture the expected status, actual status, request ID, and automated test evidence. Never include passwords, cookies, raw session tokens, or secrets in evidence or logs.

## 2. Route permission matrix

> **Path note:** The routes below include known routes and operation-level entries from the current project context. Confirm exact HTTP methods and paths from the current P0-07 controllers before treating this inventory as complete. Add any missing route, alias, or mutation.

| Area | Route / operation | Anonymous | Resource owner / current user | Other authenticated user | Expected denial / evidence to verify | Status |
|---|---|---|---|---|---|---|
| Authentication | `POST /auth/register` | Allow valid registration | Allow valid registration if handle is available | Allow valid registration if handle is available | Invalid body → 400; duplicate normalized handle → documented conflict response; no password/hash leakage | To verify |
| Authentication | `POST /auth/login` | Allow valid credentials | Allow valid credentials | Allow only with that account's valid credentials | Invalid credentials → generic 401; no account enumeration; no token in response body/logs | To verify |
| Authentication | `GET /auth/me` | Deny (401) | Allow with valid session | Only returns the identity represented by that user's own session | Missing/invalid/expired/revoked session → 401; request ID present | Existing E2E reported passing; re-run on P0-07 |
| Authentication | `POST /auth/logout` | Idempotent logout behavior; verify contract | Allow own-session logout | Only affects the supplied session, never another user's session | Must not revoke another session; cookie is cleared consistently | To verify |
| Authentication | `POST /auth/deactivate` | Deny (401) | Allow deactivation of own account | Deny deactivation of another account | Unauthenticated → 401; active sessions revoked; subsequent use of old session denied | To verify |
| Profile | Read public profile | Allow if route is public by product contract | Allow | Allow public fields only | Confirm deactivated-account behavior and fields exposed | To verify |
| Profile | Update profile (display name, bio, avatar reference) | Deny (401) | Allow own profile and only permitted fields | Deny changes to another user's profile | Cross-account update denied; immutable/unknown fields rejected; invalid values → 400 | To verify |
| Profile | Read profile media / stats | Allow if public by product contract | Allow | Allow public information according to contract | Verify deactivated users and pagination behavior | To verify |
| Follow | Follow another account | Deny (401) | Allow following a valid, different, active account | Actor is always current session user | Cannot self-follow; duplicate follow handled consistently; cannot impersonate another follower | To verify |
| Follow | Unfollow an account | Deny (401) | Allow removing own follow relationship | Cannot remove a relationship belonging to another follower | Cross-account unfollow denied or has no effect per documented contract | To verify |
| Feed | Read home feed | Allow if the feed is public by product contract; otherwise deny as specified | Allow | Return only content allowed by the feed contract | Verify visibility, deactivated accounts, deleted posts, cursor validation and bounds | To verify |
| Feed | Read following feed | Follow the documented public/authenticated contract | Allow for current user's relationships | Must not substitute another user's follow graph | Verify session policy and isolation between users | To verify |
| Feed / Search | Search public posts or accounts | Allow if public by product contract | Allow | Allow public results only | Validate query length, pagination bounds, deactivated accounts and deleted content | To verify |
| Posts | `POST /posts` (create post) | Deny (401) | Allow; author ID comes from session | Allow creating as self, never as another account | Missing/invalid session → 401; forged author fields → 400; text bounds enforced | To verify |
| Posts | `GET /posts/:id` (post detail) | Allow if public by product contract | Allow | Allow public post only | Deleted/deactivated content follows documented behavior; malformed ID → 400/404 as specified | To verify |
| Posts | `GET /posts/:id/replies` | Allow if public by product contract | Allow | Allow public replies only | Cursor/limit bounded; deleted/deactivated content follows contract | To verify |
| Posts | Edit a post | Deny (401) | Allow only for the post author and within the documented edit window | Deny | Non-owner → 403/404 per contract; unknown fields rejected; edit window enforced | To verify |
| Posts | Delete a post | Deny (401) | Allow only if the current content-lifecycle contract grants author deletion | Deny | Non-owner cannot delete; soft-delete behavior and related feed/notification visibility verified | To verify |
| Likes | Like a post | Deny (401) | Allow as current user | Allow liking as self | Cannot submit another user's actor ID; duplicate-like behavior is deterministic | To verify |
| Likes | Unlike a post | Deny (401) | Allow removing own like | Cannot remove another user's like | Cross-account unlike denied or has no effect per documented contract | To verify |
| Reposts | Repost / undo repost | Deny (401) | Allow as current user | Allow only as self | Cannot impersonate another user; duplicate/retry behavior documented and tested | To verify |
| Notifications | `GET /notifications` | Deny (401) | Allow own inbox | Deny access to another user's inbox | Unauthenticated → 401; recipient scoping tested; pagination bounded | Existing E2E reported passing; re-run on P0-07 |
| Notifications | `GET /notifications/unread-count` | Deny (401) | Allow own unread count | Deny access to another user's count | Unauthenticated → 401; count is recipient-scoped and follows deletion/deactivation rules | Existing E2E reported passing; re-run on P0-07 |
| Notifications | `PATCH /notifications/read-all` / `POST /notifications/read-all` (if both remain supported) | Deny (401) | Allow marking own notifications read | Must not modify another user's notifications | Unauthenticated → 401; update scope limited to current recipient; compatibility alias documented | To verify |
| Notifications | `PATCH /notifications/:id/read` / `POST /notifications/:id/read` (if both remain supported) | Deny (401) | Allow marking own notification read | Deny modifying another recipient's notification | Cross-recipient ID must not mutate state; malformed ID → documented 400/404 | To verify |
| Health | Health/status endpoint | Allow if designed as a public health check | Allow | Allow | Expose no secrets, environment values, or sensitive internal details | To verify |

## 3. Required negative tests

- [ ] Every protected route rejects a missing session with the documented status.
- [ ] Invalid, expired, and revoked sessions are rejected.
- [ ] A user cannot update or deactivate another account.
- [ ] A user cannot edit or delete another user's post.
- [ ] A user cannot create a post, like, follow, repost, or notification action on behalf of another user by injecting an actor/owner ID.
- [ ] A user cannot read or mutate another user's notification inbox or read state.
- [ ] Unknown fields are rejected, not silently accepted, for mutation DTOs.
- [ ] Invalid UUIDs/IDs and oversized page limits are handled consistently.
- [ ] Deactivated accounts and soft-deleted posts obey the documented visibility contract across feed, search, replies, and notifications.
- [ ] Repeated requests, concurrent requests, and retries cannot bypass authorization or create invalid duplicate state.

## 4. Evidence log

For each test, record the test name/file, request method and path, expected status, actual status, request ID, and result. Use synthetic accounts and redact credentials/cookies.

| Date | Finding / scenario | Test or evidence reference | Result | Follow-up issue / decision |
|---|---|---|---|---|
| YYYY-MM-DD | Initial P0-07 review | TBD | Not run | TBD |

## 5. Release sign-off

- [ ] Every controller route has an entry in this matrix.
- [ ] Every mutation has an explicit authentication and authorization decision.
- [ ] Public routes are explicitly identified and justified by the product contract.
- [ ] Owner, related-user, unrelated-user, and anonymous cases are tested where applicable.
- [ ] No row is marked verified without current code and test evidence.
- [ ] Any compatibility exception or known limitation has a decision record.
- [ ] Security findings are fixed or explicitly accepted by the reviewer.
- [ ] Matrix reviewed against the P0-07 branch and the final release commit.
