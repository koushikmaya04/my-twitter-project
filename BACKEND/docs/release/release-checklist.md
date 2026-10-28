# P0-07 Release Checklist

**Project:** My Twitter Project  
**Stage:** JS-P0-07 — Security, Compatibility & Release  
**Status:** In progress  
**Target branch:** `intern/koushik/js-p0-07-security-compatibility-release`

## 1. Scope and baseline

- [ ] Confirm the P0-07 branch is based on the intended P0-06 branch/commit.
- [ ] Confirm the working tree contains no unintended changes.
- [ ] Review the accepted requirements and record any scope changes.
- [ ] Confirm P0-01 through P0-06 behavior remains covered by regression tests.
- [ ] Record the Node.js and npm versions used for verification.

## 2. Build, type checking, lint, and tests

- [ ] `npm ci` completes without unresolved runtime compatibility issues.
- [ ] `npm run build` passes.
- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes, with warnings fixed or documented.
- [ ] `npm test -- --runInBand` passes.
- [ ] `npm run test:e2e -- --runInBand --detectOpenHandles` passes and exits cleanly.
- [ ] Any flaky tests or known failures are documented and approved.

Record the command output and environment for each check. Do not mark a check complete based only on a previous run if the code or dependencies have changed.

## 3. Permission and security review

- [ ] Every route is included in `permission-matrix.md`.
- [ ] Every mutation has an explicit authentication decision.
- [ ] Ownership and cross-account access are tested.
- [ ] Public reads match the product requirements.
- [ ] Unknown fields and malformed input are rejected where required.
- [ ] Payload sizes, text lengths, cursors, and pagination limits are bounded.
- [ ] Session expiry, revocation, logout, and deactivated-account behavior are verified.
- [ ] Passwords, cookies, and session tokens are not logged.
- [ ] Request IDs allow failures to be traced without exposing credentials.
- [ ] CORS and cookie behavior are documented for the deployed frontend/backend origins.
- [ ] Production configuration does not depend on development-only identity shortcuts.
- [ ] Findings in `security-review.md` are fixed or explicitly accepted with rationale.

## 4. Dependency and runtime compatibility

- [ ] Node.js version satisfies the engine requirements of installed dependencies.
- [ ] `npm audit` output has been reviewed.
- [ ] `npm audit --omit=dev` output has been reviewed.
- [ ] Vulnerabilities have fixes, documented mitigations, or explicit accepted-risk decisions.
- [ ] Dependency updates are tested; no blind `npm audit fix --force` was used.
- [ ] Lockfile changes are reviewed and committed when appropriate.

## 5. Database and migration readiness

- [ ] Clean-database migration rehearsal completed.
- [ ] Upgrade from the accepted V1 schema completed in a disposable database.
- [ ] Existing data and relationships were checked before and after migration.
- [ ] Schema constraints and indexes were verified.
- [ ] Critical writes have rollback and concurrency evidence.
- [ ] Recovery steps and irreversible migration limitations are documented.
- [ ] `migration-rehearsal.md` contains actual evidence and results.

## 6. Compatibility and API contract

- [ ] Existing API routes and response shapes were compared with the accepted baseline.
- [ ] Intentional breaking changes are documented.
- [ ] Deprecations include rationale and a migration path where applicable.
- [ ] Validation and error response formats are consistent and documented.
- [ ] Test-only fixtures and seed shortcuts cannot impersonate normal production users.
- [ ] README and `.env.example` match the actual runtime configuration.

## 7. Release documentation and smoke checks

- [ ] Setup and migration instructions work from a clean checkout.
- [ ] Required environment variables and safe example values are documented.
- [ ] Release smoke-test steps are documented.
- [ ] Rollback considerations and known limitations are documented.
- [ ] Required release evidence is linked or stored with the project.
- [ ] Mentor/reviewer has reviewed the final evidence.

## 8. Release smoke-test record

| Check | Expected result | Actual result | Evidence / request ID | Status |
|---|---|---|---|---|
| Application startup | Starts with documented config | Not run | Add output | Pending |
| Health endpoint | Healthy response | Not run | Add response | Pending |
| Register/login | Valid flow works | Not run | Add test/request ID | Pending |
| Missing/invalid session | Protected action denied | Not run | Add test/request ID | Pending |
| Profile ownership | Cannot update another user | Not run | Add test/request ID | Pending |
| Post ownership | Matches documented policy | Not run | Add test/request ID | Pending |
| Notifications isolation | Only own inbox/state accessible | Not run | Add test/request ID | Pending |
| Database migration | Expected schema present | Not run | Add output | Pending |

Adjust endpoints to the actual API and documented product requirements before running the smoke tests.

## 9. Final sign-off

- [ ] All required tests pass on the release candidate.
- [ ] No unresolved critical/high-severity issue remains without explicit approval.
- [ ] Permission matrix and security review are complete.
- [ ] Migration rehearsal is complete.
- [ ] Compatibility changes and limitations are documented.
- [ ] Release evidence is reviewable.
- [ ] Final review/approval recorded.

**Release rule:** Do not mark this checklist complete until each required item has evidence. A passing test suite alone does not establish production readiness.
