# Decision 07 — Device Manager and Multi-Device Session Management

**Status:** Accepted  
**Feature:** Multi-Device Session Management and Device Manager (`ManageDevices`)

---

## 1. Decision

Implement multi-device session management and granular revocation backed by PostgreSQL via Drizzle ORM. Active client sessions persist in the `sessions` table, recording client metadata (User-Agent, IP address, creation time, expiration time, and revocation timestamp). 

Clients can list their active sessions, selectively revoke individual device sessions, or bulk-revoke all other devices with a single action. An in-house, zero-dependency, deterministic User-Agent parser (`DeviceDetector`) accurately classifies browsers, operating systems, and device categories without third-party runtime overhead.

---

## 2. Options Considered

1. **Granular Multi-Device Session Storage with High-Accuracy UA Parsing (Selected):**
   - Store session metadata in the PostgreSQL `sessions` table.
   - Browser receives an opaque, cryptographically random session token in an `HttpOnly` cookie.
   - Database stores the SHA-256 hash (`token_hash`) as the primary key.
   - Fast, deterministic regex parsing extracts browser, OS, and device type (`Desktop`, `Mobile`, `Tablet`).
   - *Pros:* Complete user visibility, granular control over compromised devices, and clean UX with current-device protection.
   - *Cons:* Requires active session table housekeeping and User-Agent parsing logic.

2. **Single-Session Enforcement (Last-Write Invalidation):**
   - Logging in on a new device automatically invalidates all existing sessions for that user.
   - *Pros:* Simple to implement; only one active row per user.
   - *Cons:* Extremely poor multi-device user experience (logging in on a laptop terminates the user's phone session).

3. **Heavy Third-Party User-Agent Parser Library (e.g., `ua-parser-js`):**
   - Import external package for parsing User-Agent strings.
   - *Pros:* Off-the-shelf signatures.
   - *Cons:* Adds bundle bloat, external dependency supply-chain risks, and frequent inaccuracies with modern Chromium/Safari User-Agent reduction strings.

---

## 3. Architecture & Implementation References

### Database Schema (`src/database/schema/sessions.ts`)
- `token_hash`: `text` (Primary Key, SHA-256 hash of the 32-byte session token).
- `id`: `uuid` (Public, non-sensitive identifier used in API routes).
- `user_id`: `uuid` (Foreign key referencing `users.id` with `ON DELETE CASCADE`).
- `user_agent`: `text` (Raw User-Agent string captured during login).
- `ip_address`: `text` (Remote IP address of the client).
- `expires_at`: `timestamptz(3)` (7-day absolute expiration).
- `revoked_at`: `timestamptz(3)` (Nullable; set to `NOW()` when session is invalidated).
- `created_at`: `timestamptz(3)` (Default `NOW()`).
- Index: `sessions_user_id_idx` on `(user_id)`.

### Device Detection Engine (`src/common/device-detection/device-detector.ts`)
- **Browser Detection:** Distinguishes Microsoft Edge, Opera, Samsung Internet, Firefox, Chrome, and Safari, respecting browser ordering precedence (e.g., Edge user agents containing Chrome).
- **OS Detection:** Maps Windows NT kernel versions (`10.0` $\rightarrow$ `Windows 10/11`, `6.3` $\rightarrow$ `Windows 8.1`, etc.), Android versioning, iOS/iPadOS, macOS, Linux, and Chrome OS.
- **Device Classification:** Categorizes hardware as `Desktop`, `Mobile`, `Tablet`, or `Unknown device`.

### API Routes & Controllers (`src/auth/auth.controller.ts`)
- `GET /auth/sessions`: Returns all unexpired, non-revoked sessions for the authenticated user, enriched with parsed device details and an `isCurrent` boolean flag.
- `DELETE /auth/sessions/:id`: Revokes a specific session by its public UUID. If `isCurrent === true`, immediately issues `Set-Cookie: session=; Max-Age=0` to clear the browser cookie.
- `POST /auth/sessions/revoke-others`: Bulk-revokes all active sessions for the user where `token_hash <> currentTokenHash`, preserving the active session on the caller's device.

### Frontend Component (`UI/src/components/ManageDevices/ManageDevices.jsx`)
- Displays distinct device cards with hardware-specific icons (`Desktop`, `Mobile`, `Tablet`).
- Highlights current device with `"This Device (Active Now)"` badge.
- Provides modal confirmation warnings when attempting to revoke the current session (alerting the user of immediate logout).
- Single-click action to revoke all other devices.

---

## 4. Invariants & Security Guarantees

1. **Anti-IDOR:** A user can only view and revoke sessions belonging to their verified `request.user.id`. Requests attempting to revoke another user's session return `404 Not Found` without modifying data.
2. **Secret Non-Exposure:** The database stores only the SHA-256 hash of the session token. The public session `id` is a UUID, preventing token reconstruction even with full database read access.
3. **Immediate Revocation:** Once `revoked_at` is set, `SessionGuard` rejects the token immediately on subsequent requests.
4. **Current Session Preservation:** `revokeOtherSessions` uses atomic SQL conditions (`userId = $1 AND tokenHash <> $2`) to guarantee the current active session is never accidentally revoked.
5. **Auditing:** Every session lifecycle event (`SESSION_CREATED`, `SESSION_REVOKED`, `OTHER_SESSIONS_REVOKED`) is recorded in the PostgreSQL `audit_logs` table.

---

## 5. Tests Proving It

- `test/device-detection-and-audit.spec.ts`:
  - Accurately detects Windows Chrome, Linux Desktop Chrome, Android Mobile Chrome, iPhone Safari, iPadOS Safari, Microsoft Edge, and Firefox.
  - Safe fallbacks for missing or empty User-Agent headers.
- `src/auth/auth.service.spec.ts` & `src/auth/auth.controller.spec.ts`:
  - `getSessions` returns active sessions and correctly identifies `isCurrent`.
  - `revokeSession` marks session revoked and flags `isCurrent: true` when the current token matches.
  - `revokeOtherSessions` revokes other devices and preserves the active session.
  - Attempting to revoke a non-existent or foreign session throws `NotFoundException`.
