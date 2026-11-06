# P0-07 — Security, Compatibility, and Release Decisions

**Project:** My Twitter Project  
**Track:** JavaScript P0  
**Branch:** `intern/koushik/js-p0-07-security-compatibility-release`  
**Status:** Completed & Accepted  
**Last updated:** 2026-11-06  

## Purpose

Record the decisions that govern P0-07 security, API compatibility, database migration safety, release readiness, and rollback. All decisions below have been verified with passing test evidence, migration rehearsals, and architectural reviews.

## Decision status

- **Accepted** — confirmed by implementation, verified by automated tests and migration rehearsals.

---

## D-01 — Preserve API compatibility

**Status:** Accepted

**Decision:** P0-07 preserves existing API behavior unless a change is explicitly required and documented. Existing routes, request/response shapes, status codes, validation rules, and authentication behavior match the supported baseline. The public feed at `GET /feed` remains accessible for backwards compatibility, while authenticated personalized feed is hosted at `GET /feed/home`.

**Evidence:**
- Passing tests in `test/social-feed.integration.spec.ts` and `src/feed/feed.controller.spec.ts`.
- Compatibility verified across error envelope shapes and V1 legacy feeds.

---

## D-02 — Authentication and authorization remain enforced

**Status:** Accepted

**Decision:** Frontend integration and release hardening strictly enforce authentication, authorization, ownership checks, session expiry, and server-side validation. Actors are derived strictly from verified session tokens in `HttpOnly` cookies.

**Evidence:**
- Passing tests in `src/auth/auth.controller.spec.ts`, `src/auth/auth.service.spec.ts`, and `test/app.e2e-spec.ts`.
- Protected routes reject missing, invalid, expired, and revoked sessions with `401 Unauthorized`.
- Non-owners cannot mutate another user's profile, post, or notification state.

---

## D-03 — Database migration safety

**Status:** Accepted

**Decision:** Database changes are versioned, reproducible, and tested via Drizzle ORM migrations (`0000` through `0007`). Migrations apply cleanly to an empty database and upgrade from the accepted V1 schema without data loss.

**Evidence:**
- Verified in `docs/release/migration-rehearsal.md`.
- Clean migration rehearsal and V1 schema upgrade completed successfully.
- Check constraints and foreign keys verified via `db/constraint-tests.sql`.

---

## D-04 — Rollback and recovery

**Status:** Accepted

**Decision:** Release instructions distinguish application rollback from database rollback. Application rollback to the prior release artifact is safe because schema additions (e.g. `audit_logs`, `is_edited`, `version`, `notifications`) are backward-compatible and additive.

**Evidence:**
- Rehearsed and documented in `docs/release/migration-rehearsal.md` and `docs/release/release-checklist.md`.
- Forward-fix and database snapshot restore procedures documented.

---

## D-05 — Concurrency and failure paths

**Status:** Accepted

**Decision:** Operations involving relationships, likes, notifications, and content lifecycle preserve database invariants under duplicate requests, concurrent requests, and partial failures. Atomic PostgreSQL transactions wrap all dual-entity mutations (`setLike`, `setFollow`, `createPost`).

**Evidence:**
- Verified in `db/transaction-tests.sql` and `test/notifications.integration.spec.ts`.
- Optimistic concurrency version check (`version = version + 1`) prevents lost updates on posts.
- Compound uniqueness and `ON CONFLICT DO NOTHING / UPDATE` guarantee idempotency.

---

## D-06 — Permissions and ownership matrix

**Status:** Accepted

**Decision:** The permissions matrix in `docs/release/permission-matrix.md` is the source of truth for all API operations. Every controller route and mutation maps to an explicit authentication and authorization rule.

**Evidence:**
- Verified against all controllers and guards.
- All routes verified and recorded in `docs/release/permission-matrix.md`.

---

## D-07 — Configuration and secrets

**Status:** Accepted

**Decision:** Required environment configuration is documented in `.env.example` and validated at startup. Secrets are supplied via environment variables; credentials and raw session secrets are never committed or logged.

**Evidence:**
- Verified in `docs/release/security-review.md`.
- Passwords hashed with `argon2`; session secrets hashed with SHA-256 before database insertion.

---

## D-08 — Release gate

**Status:** Accepted

**Decision:** All required builds, unit tests, integration tests, E2E tests, migration rehearsals, and security checks have passed.

**Evidence:**
- Full suite passing: `social-feed.integration.spec.ts`, `notifications.integration.spec.ts`, `device-detection-and-audit.spec.ts`, `app.e2e-spec.ts`.
- Release checklist completed in `docs/release/release-checklist.md`.

---

## D-09 — Request IDs and operational diagnostics

**Status:** Accepted

**Decision:** Request IDs are generated/preserved via `RequestIdMiddleware`, attached to the `X-Request-ID` response header, and included in structured JSON logs and error envelopes.

**Evidence:**
- Verified in `src/common/request-logging/request-id.middleware.ts` and `src/common/errors/http-exception.filter.ts`.

---

## D-10 — Release limitations and known risks

**Status:** Accepted

**Decision:** All known limitations (such as public accounts scope, 30-minute edit deadline, permanent soft-deactivation) are explicitly documented in decisions records `01` through `08`.

**Evidence:**
- Documented in `docs/release/security-review.md` and `docs/decisions/`.

---

## Acceptance record

| Item | Result | Evidence / notes |
|---|---|---|
| API compatibility | Passed | `GET /feed` preserved, `GET /feed/home` added; error envelopes standardized. |
| Authentication and authorization | Passed | `SessionGuard` enforced; actor derived strictly from session; cross-account rejected. |
| Clean database migration | Passed | Migrations 0000–0007 applied cleanly; constraints verified. |
| V1 upgrade migration | Passed | Additive columns preserve existing user and post rows without loss. |
| Rollback/recovery rehearsal | Passed | Application rollback procedure documented; point-in-time restore verified. |
| Concurrency/failure-path tests | Passed | `transaction-tests.sql` and optimistic concurrency verified. |
| Configuration and secrets review | Passed | Zero credentials in logs; `.env.example` sanitized. |
| Full build and test suite | Passed | All unit, integration, and e2e test suites pass cleanly. |
| Release smoke tests | Passed | Core member journeys verified end-to-end. |
| Security review and known risks | Passed | Documented in `security-review.md`. |

---

## Final approval

- **Reviewed by:** Engineering Review / P0 Track Verification
- **Review date:** 2026-11-06
- **Release decision:** Approved for Release
- **Outstanding blockers:** None
