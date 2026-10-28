# P0-07 Migration Rehearsal

**Project:** My Twitter Project  
**Stage:** JS-P0-07 — Security, Compatibility & Release  
**Status:** Not started

## 1. Objective

Verify that database migrations can be applied from a clean installation and upgrade an accepted V1 database without losing valid existing data.

The project uses PostgreSQL and Drizzle ORM. Use the repository's actual migration files and documented V1 schema as the source of truth.

## 2. Preconditions

- [ ] Confirm the current Git branch is the P0-07 branch.
- [ ] Review the working tree and migration files.
- [ ] Identify the exact accepted V1 schema or database snapshot.
- [ ] Identify the target database version and migration sequence.
- [ ] Configure a disposable test database.
- [ ] Back up any database containing data that must be preserved.
- [ ] Confirm the database URL points to the intended test database before running migrations.

**Safety:** Never use a production database for rehearsal. Do not reset or drop a database until its identity and backup have been verified.

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

- [ ] All expected migrations apply successfully.
- [ ] Required tables, indexes, constraints, and columns exist.
- [ ] Schema verification passes.
- [ ] Application startup succeeds against the migrated database.
- [ ] Relevant integration and E2E tests pass.

## 4. Scenario B — Upgrade from accepted V1

### Procedure

1. Identify the documented V1 schema and migration starting point.
2. Create a disposable database representing that V1 state.
3. Insert representative V1 records, including users and posts where applicable.
4. Record baseline row counts and important relationships.
5. Run the documented forward migration sequence.
6. Verify the resulting schema and data.
7. Run application and regression tests against the upgraded database.

### Data preservation checks

- [ ] Existing users remain present.
- [ ] Existing posts remain present.
- [ ] Relationships and foreign keys remain valid.
- [ ] Existing records receive valid values for newly required columns.
- [ ] New constraints accept valid legacy data.
- [ ] No unexpected records are deleted or duplicated.
- [ ] The application can read and update migrated records.

Adapt these checks to the actual tables and differences between the accepted V1 schema and the target release. Do not assume every table or field existed in V1.

## 5. Scenario C — Migration failure and recovery

- [ ] Identify which migrations are transactional and which may leave partial changes.
- [ ] Test a controlled failure in a disposable database where practical.
- [ ] Verify whether partial changes are rolled back or require manual recovery.
- [ ] Document recovery steps and irreversible operations.
- [ ] Verify that retrying the documented procedure is safe.

Do not manually edit migration history or delete migration records to force a successful run.

## 6. Evidence log

| Scenario | Database starting state | Command / procedure | Result | Evidence | Status |
|---|---|---|---|---|---|
| A — Clean install | Empty database | `npm run db:migrate` | Not run | Attach output | Pending |
| A — Schema check | Migrated database | `npm run db:check` | Not run | Attach output | Pending |
| B — V1 upgrade | Accepted V1 schema | Documented migration sequence | Not run | Before/after counts | Pending |
| B — Regression | Upgraded database | Relevant tests | Not run | Test output | Pending |
| C — Failure recovery | Disposable test database | Controlled failure | Not run | Recovery notes | Pending |

## 7. Final sign-off

- [ ] Clean installation verified.
- [ ] V1 upgrade verified.
- [ ] Existing data preserved.
- [ ] Constraints and indexes verified.
- [ ] Regression tests passed.
- [ ] Failure and recovery behavior documented.
- [ ] Known migration limitations recorded.
- [ ] Mentor/reviewer approval obtained.

**Completion rule:** Mark this rehearsal complete only after collecting actual command output and data-preservation evidence. A successful migration command alone does not prove that a V1 upgrade is safe.
