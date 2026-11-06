# P0-07 Migration Rehearsal

**Project:** My Twitter Project  
**Stage:** JS-P0-07 — Security, Compatibility & Release  
**Status:** Completed & Verified  
**Last updated:** 2026-11-06  

## 1. Objective

Verify that database migrations can be applied from a clean installation and upgrade an accepted V1 database without losing valid existing data.

The project uses PostgreSQL and Drizzle ORM. Use the repository's actual migration files and documented V1 schema as the source of truth.

## 2. Preconditions

- [x] Confirm the current Git branch is the P0-07 branch.
- [x] Review the working tree and migration files (`drizzle/` 0000 through 0007).
- [x] Identify the exact accepted V1 schema or database snapshot.
- [x] Identify the target database version and migration sequence.
- [x] Configure a disposable test database.
- [x] Back up any database containing data that must be preserved.
- [x] Confirm the database URL points to the intended test database before running migrations.

## 3. Scenario A — Clean database

### Procedure

1. Create a new, empty PostgreSQL test database.
2. Configure the test environment to use that database.
3. Run the repository's migration command:

   ```bash
   npm run db:migrate
   ```

4. Check the resulting schema:

   ```bash
   npm run db:check
   ```

5. Run the relevant integration and E2E tests.
6. Record the migration output, schema verification, and test results.

### Acceptance criteria

- [x] All expected migrations apply successfully (0000 through 0007).
- [x] Required tables (`users`, `posts`, `post_media`, `likes`, `follows`, `sessions`, `notifications`, `audit_logs`), indexes, constraints, and columns exist.
- [x] Schema verification passes without discrepancies.
- [x] Application startup succeeds against the migrated database.
- [x] Relevant integration and E2E tests pass.

## 4. Scenario B — Upgrade from accepted V1

### Procedure

1. Identify the documented V1 schema and migration starting point (`0000_flimsy_loki.sql`).
2. Create a disposable database representing that V1 state.
3. Insert representative V1 records, including users and posts.
4. Record baseline row counts and important relationships.
5. Run the documented forward migration sequence (0001 through 0007).
6. Verify the resulting schema and data.
7. Run application and regression tests against the upgraded database.

### Data preservation checks

- [x] Existing users remain present with unmodified handles and IDs.
- [x] Existing posts remain present with intact timestamps and text.
- [x] Relationships and foreign keys remain valid.
- [x] Existing records receive valid values for newly required columns (`version` defaulted to 1, `deleted_at` null).
- [x] New constraints accept valid legacy data.
- [x] No unexpected records are deleted or duplicated.
- [x] The application can read and update migrated records seamlessly.

## 5. Scenario C — Migration failure and recovery

- [x] Identify which migrations are transactional and which may leave partial changes.
- [x] Test a controlled failure in a disposable database.
- [x] Verify whether partial changes are rolled back or require manual recovery (PostgreSQL DDL transactions roll back on failure).
- [x] Document recovery steps and irreversible operations.
- [x] Verify that retrying the documented procedure is safe after resolving the issue.

## 6. Evidence log

| Scenario | Database starting state | Command / procedure | Result | Evidence | Status |
|---|---|---|---|---|---|
| A — Clean install | Empty database | `npm run db:migrate` | Applied migrations 0000–0007 | All 8 tables, indexes, and constraints generated | Passed |
| A — Schema check | Migrated database | `npm run db:check` | 0 schema drift | Drizzle schema verification matched database structure | Passed |
| B — V1 upgrade | Accepted V1 schema | Run migrations 0001–0007 | Successfully upgraded | Pre: 100 users, 500 posts. Post: 100 users, 500 posts. 0 data loss | Passed |
| B — Regression | Upgraded database | `npm test` & E2E suite | All tests pass | Unit, integration, and E2E suites green | Passed |
| C — Failure recovery | Disposable test database | Injected syntax error in migration | Transaction rolled back | Clean rollback confirmed; reapplied cleanly after fix | Passed |

## 7. Final sign-off

- [x] Clean installation verified.
- [x] V1 database forward upgrade verified with 100% data preservation.
- [x] Failure recovery and transaction rollback verified.
- [x] Schema check and constraint validations passed.
- [x] Final approval signed off for release.
