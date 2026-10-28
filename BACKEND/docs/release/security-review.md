# P0-07 Security Review

**Project:** My Twitter Project  
**Stage:** JS-P0-07 — Security, Compatibility & Release  
**Status:** In progress

## 1. Objective

Review the backend for authentication, authorization, input validation, session security, safe logging, configuration, and database reliability before release.

## 2. Authentication and authorization

- [ ] Every mutation has an explicit authentication decision.
- [ ] Users cannot modify another user's profile.
- [ ] Users cannot edit or delete posts unless permitted by the ownership rules.
- [ ] Users cannot access or modify another user's private notification state.
- [ ] Deactivated accounts cannot continue using invalidated sessions.
- [ ] Logout and session revocation behave correctly.
- [ ] Public endpoints remain accessible where the product requirements permit them.

**Evidence:** Record the route, expected status, actual status, and relevant test name for each check.

## 3. Input validation

- [ ] Unknown request fields are rejected.
- [ ] Required fields and data types are validated.
- [ ] Request body sizes and text lengths are bounded.
- [ ] Pagination limits and cursor formats are validated.
- [ ] Invalid UUIDs and malformed query parameters are rejected.
- [ ] Invalid input does not cause unhandled server errors.

## 4. Session and credential security

- [ ] Passwords are hashed using the configured password-hashing algorithm.
- [ ] Raw session tokens are not stored in the database.
- [ ] Session cookies use `HttpOnly`.
- [ ] Production cookies use `Secure`.
- [ ] Cookie `SameSite`, path, expiration, and credential transport are documented.
- [ ] Login failures do not reveal whether an account exists.
- [ ] Revoked and expired sessions are rejected.

## 5. CORS and production configuration

- [ ] Allowed frontend origins are explicitly configured.
- [ ] Credentialed requests work only with an approved origin when required.
- [ ] Production configuration does not rely on development defaults.
- [ ] Database connection settings are validated.
- [ ] Secrets are supplied through a secure environment configuration.
- [ ] Demo-user or test-only identity shortcuts cannot impersonate a production user.
- [ ] `.env` files containing secrets are excluded from version control.

## 6. Logging and error handling

- [ ] Requests have traceable request IDs.
- [ ] Passwords, cookies, session tokens, and authorization headers are never logged.
- [ ] Authentication outcomes can be investigated without exposing credentials.
- [ ] Unexpected errors return safe responses.
- [ ] Validation and authorization failures have consistent response formats.
- [ ] Logs contain enough information to correlate failed requests with tests.

## 7. Database reliability

- [ ] Critical multi-table writes use appropriate transactions.
- [ ] Failed transactions roll back all related changes.
- [ ] Concurrent duplicate requests preserve database constraints.
- [ ] Retry behavior does not create duplicate records or notifications.
- [ ] Migrations work against a clean database.
- [ ] Upgrade migrations preserve accepted V1 data.
- [ ] Rollback limitations are documented.

## 8. Dependency and runtime review

- [ ] Supported Node.js version is documented and used.
- [ ] Production dependency vulnerabilities are reviewed.
- [ ] Dependency updates do not break the existing test suites.
- [ ] Build and TypeScript checks pass.
- [ ] Lint warnings are resolved or explicitly justified.
- [ ] E2E tests exit without unexplained open handles.

## 9. Verification commands

Run from `BACKEND`:

```bash
npm run build
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand --detectOpenHandles
npm audit
npm audit --omit=dev
```

Investigate each failure or vulnerability. Do not mark a check complete based solely on running the command.

## 10. Findings log

| ID | Finding | Severity | Evidence | Fix / decision | Status |
|---|---|---|---|---|---|
| SEC-001 | Node.js engine compatibility warning | To assess | Install output | Align runtime with supported version | Open |
| SEC-002 | Dependency vulnerabilities | To assess | `npm audit` output | Review affected packages and safe updates | Open |
| SEC-003 | E2E process may retain open handles | To assess | Jest output | Identify and close outstanding resources | Open |
| SEC-004 | Four unused-import lint warnings | Low / confirm | ESLint output | Remove unused imports if still present | Open |

## 11. Sign-off

- [ ] Permission matrix reviewed against actual controllers and guards.
- [ ] Security findings fixed or explicitly accepted.
- [ ] Regression and E2E tests pass.
- [ ] Migration rehearsal completed.
- [ ] Release and rollback instructions documented.
- [ ] Final review completed with mentor.

**Review rule:** Do not mark a finding as fixed until the implementation has been inspected and the relevant test or other evidence has passed.
