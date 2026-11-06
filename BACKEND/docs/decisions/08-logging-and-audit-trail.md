# Decision 08 — Structured Logging, Request Correlation, and Security Audit Trail

**Status:** Accepted  
**Feature:** Enterprise Observability, Request Correlation (`X-Request-ID`), and Audit Logging

---

## 1. Decision

Implement an end-to-end, dual-channel observability and audit logging architecture. 
1. **Request Correlation:** Every incoming HTTP request is assigned a unique `X-Request-ID` (extracted or generated) propagated through all middleware, controllers, services, database queries, and response headers.
2. **Standard Application Logging:** A high-performance structured JSON logger (`AppStructuredLogger`) outputs machine-readable logs to `stdout`/`stderr` with level, timestamp, context, message, request ID, and metadata.
3. **Security Audit Trail:** A persistent audit logger (`AuditLoggerService`) writes business and security events (`LOGIN_SUCCESS`, `SESSION_REVOKED`, `POST_DELETED`, etc.) to the PostgreSQL `audit_logs` table with non-blocking error boundaries.

---

## 2. Options Considered

1. **Dual-Channel (Structured JSON Console + PostgreSQL Audit Table) with Non-Blocking Storage (Selected):**
   - High-throughput JSON output to standard streams for container/cloud aggregation (Datadog, Render, CloudWatch).
   - Dedicated PostgreSQL `audit_logs` table for compliance, security investigation, and historical queryability.
   - Non-blocking try-catch wrapping database writes so audit failures never disrupt primary user actions.
   - *Pros:* High reliability, cloud-native log ingestion, and permanent SQL-queryable audit trail without distributed messaging dependencies.
   - *Cons:* Dual-write cost on security actions, mitigated by minimal write amplification and indexing.

2. **Unstructured Console Logging Only (`console.log`):**
   - Rely solely on standard text logging.
   - *Pros:* Simplest possible setup.
   - *Cons:* Cannot be parsed reliably by log aggregators; searchability is poor; transient container restarts lose history.

3. **Synchronous Transactional Auditing in Application Transactions:**
   - Write audit logs inside the primary business transaction.
   - *Pros:* Perfect atomicity between operation and audit log.
   - *Cons:* If an audit log insert fails (e.g. schema constraint), the user's valid operation rolls back; unnecessary performance overhead.

---

## 3. Architecture & Implementation References

### Middleware Pipeline
- `src/common/request-logging/request-id.middleware.ts`:
  - Extracts incoming `x-request-id` header or generates a cryptographically random UUID.
  - Injects `requestId` into the Express `request` object.
  - Sets the `X-Request-ID` response header for client-side correlation.
- `src/common/request-logging/request-logging.middleware.ts`:
  - Records request start time.
  - Hooks `response.on('finish')` to log execution duration:
    `${method} ${path} ${statusCode} ${durationMs}ms requestId=${requestId}`.

### Structured Application Logger (`src/common/logger/structured-logger.ts`)
- Standard JSON schema emitted to console:
  ```json
  {
    "timestamp": "2026-11-06T08:50:00.000Z",
    "level": "INFO",
    "context": "AuthService",
    "message": "User logged in successfully",
    "requestId": "92afd30c-713f-4cfb-832c-a51e0f66965e",
    "extra": { "statusCode": 200, "success": true }
  }
  ```
- Redacts stack traces in production (`process.env.NODE_ENV === 'production'`).

### Audit Log Schema (`src/database/schema/audit-logs.ts`)
- `id`: `uuid` (Primary Key).
- `actor_user_id`: `uuid` (References `users.id` with `ON DELETE SET NULL`).
- `actor_username`: `text`.
- `action`: `text` (e.g. `LOGIN_SUCCESS`, `LOGIN_FAILED`, `POST_DELETED`, `SESSION_REVOKED`).
- `target_type`: `text` (`USER`, `POST`, `SESSION`, etc.).
- `target_id`: `text`.
- `target_username`: `text`.
- `http_method`: `text`.
- `route`: `text`.
- `status_code`: `integer`.
- `success`: `boolean` (Default `true`).
- `request_id`: `text`.
- `session_id`: `text`.
- `description`: `text`.
- `error_code`: `text`.
- `created_at`: `timestamptz(3)` (Default `NOW()`).
- Indexes: `actor_user_id`, `action`, `(target_type, target_id)`, `created_at`.

### Audit Logger Service (`src/common/logger/audit-logger.service.ts`)
- Integrates with `AuthService`, `UsersService`, and `DrizzleSocialFeedRepository`.
- Catches database persistence exceptions and logs them via `AppStructuredLogger` without rethrowing.

---

## 4. Invariants & Security Guarantees

1. **Zero Credential Exposure:** Passwords, password hashes, raw session tokens, session cookies, and authorization headers are strictly excluded from all log payloads and audit fields.
2. **Deterministic Correlation:** Every log line and error response carries the identical `requestId`, allowing support reviewers to trace any failure across frontend and backend.
3. **Non-Blocking Operation:** An issue writing to the `audit_logs` table will never crash the server, block the event loop, or fail a user's transaction.
4. **Normalized Error Envelope:** Unhandled exceptions and domain errors pass through `HttpExceptionFilter`, embedding the `requestId` in the user-facing error response.

---

## 5. Tests Proving It

- `test/device-detection-and-audit.spec.ts`:
  - Verifies successful audit logging creates formatted DB rows and JSON logs.
  - Verifies failed operations record `success: false` and `errorCode`.
  - Verifies DB insert failures in `AuditLoggerService` are caught and logged without throwing errors.
- `src/common/request-logging/request-id.interceptor.ts` & middleware tests:
  - Verifies incoming request IDs are preserved.
  - Verifies missing request IDs generate valid UUIDs and set `X-Request-ID` header.
