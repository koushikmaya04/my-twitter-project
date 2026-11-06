# P0-07 Release Checklist

**Project:** My Twitter Project  
**Stage:** JS-P0-07 — Security, Compatibility & Release  
**Status:** Completed & Ready for Release  
**Target branch:** `intern/koushik/js-p0-07-security-compatibility-release`  
**Last updated:** 2026-11-06  

## 1. Scope and baseline

- [x] Confirm the P0-07 branch is based on the intended P0-06 branch/commit.
- [x] Confirm the working tree contains no unintended changes.
- [x] Review the accepted requirements and record any scope changes.
- [x] Confirm P0-01 through P0-06 behavior remains covered by regression tests.
- [x] Record the Node.js and npm versions used for verification (Node.js v22.x, npm v10.x).

## 2. Build, type checking, lint, and tests

- [x] `npm ci` completes without unresolved runtime compatibility issues.
- [x] `npm run build` passes.
- [x] `npx tsc --noEmit` passes with zero errors.
- [x] `npm run lint` passes, with warnings fixed or documented.
- [x] `npm test -- --runInBand` passes all test suites.
- [x] `npm run test:e2e -- --runInBand --detectOpenHandles` passes and exits cleanly.
- [x] Any flaky tests or known failures are documented and resolved.

## 3. Permission and security review

- [x] Every route is included in `permission-matrix.md`.
- [x] Every mutation has an explicit authentication decision.
- [x] Ownership and cross-account access are tested.
- [x] Public reads match the product requirements.
- [x] Unknown fields and malformed input are rejected where required.
- [x] Payload sizes, text lengths, cursors, and pagination limits are bounded.
- [x] Session expiry, revocation, logout, and deactivated-account behavior are verified.
- [x] Passwords, cookies, and session tokens are not logged.
- [x] Request IDs allow failures to be traced without exposing credentials.
- [x] CORS and cookie behavior are documented for the deployed frontend/backend origins.
- [x] Production configuration does not depend on development-only identity shortcuts.
- [x] Findings in `security-review.md` are fixed or explicitly accepted with rationale.

## 4. Dependency and runtime compatibility

- [x] Node.js version satisfies the engine requirements of installed dependencies.
- [x] `npm audit` output has been reviewed.
- [x] `npm audit --omit=dev` output has been reviewed.
- [x] Vulnerabilities have fixes, documented mitigations, or explicit accepted-risk decisions.
- [x] Dependency updates are tested; no blind `npm audit fix --force` was used.
- [x] Lockfile changes are reviewed and committed when appropriate.

## 5. Database and migration readiness

- [x] Clean-database migration rehearsal completed.
- [x] Upgrade from the accepted V1 schema completed in a disposable database.
- [x] Existing data and relationships were checked before and after migration.
- [x] Schema constraints and indexes were verified.
- [x] Critical writes have rollback and concurrency evidence.
- [x] Recovery steps and irreversible migration limitations are documented.
- [x] `migration-rehearsal.md` contains actual evidence and results.

## 6. Compatibility and API contract

- [x] Existing API routes and response shapes were compared with the accepted baseline.
- [x] Intentional breaking changes are documented.
- [x] Deprecations include rationale and a migration path where applicable.
- [x] Validation and error response formats are consistent and documented.
- [x] Test-only fixtures and seed shortcuts cannot impersonate normal production users.
- [x] README and `.env.example` match the actual runtime configuration.

## 7. Release documentation and smoke checks

- [x] Setup and migration instructions work from a clean checkout.
- [x] Required environment variables and safe example values are documented.
- [x] Release smoke-test steps are documented.
- [x] Rollback considerations and known limitations are documented.
- [x] Required release evidence is linked or stored with the project.
- [x] Mentor/reviewer has reviewed the final evidence.

## 8. Release smoke-test record

| Check | Expected result | Actual result | Evidence / request ID | Status |
|---|---|---|---|---|
| Application startup | Starts with documented config | Booted cleanly, database connected | Logs: `[NestApplication] Nest application successfully started` | Passed |
| Health endpoint | Healthy response | Returns `{ status: "ok" }` with 200 status | `GET /health` (`req-health-001`) | Passed |
| Register/login | Valid flow works | 201 Created and 200 OK with session cookie | `POST /auth/register`, `POST /auth/login` | Passed |
| Missing/invalid session | Protected action denied | 401 Unauthorized with standardized error envelope | `GET /auth/me` without cookie | Passed |
| Profile ownership | Cannot update another user | 403 Forbidden / DB state unchanged | `PATCH /users/:id` cross-user test | Passed |
| Post ownership | Matches documented policy | Non-author edit/delete rejected; 30m window enforced | `test/social-feed.integration.spec.ts` | Passed |
| Notifications isolation | Only own inbox/state accessible | Recipient scoped, 403/404 on foreign notification mutation | `test/notifications.integration.spec.ts` | Passed |
| Database migration | Expected schema present | All tables, indexes, and constraints applied | `drizzle/` migrations 0000–0007 verified | Passed |

## 9. Final sign-off

- [x] All required tests pass on the release candidate.
- [x] No unresolved critical/high-severity issue remains without explicit approval.
- [x] Permission matrix and security review are complete.
- [x] Migration rehearsal is complete.
- [x] Release approval signed off for deployment.
