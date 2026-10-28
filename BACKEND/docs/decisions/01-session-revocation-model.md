# Decision: Server-Side Session and Revocation Model

**Decision:** Use server-side sessions stored in PostgreSQL, accessed through Drizzle ORM. The browser receives a cryptographically random session identifier in an HTTP-only cookie. The database stores a hash of the identifier rather than the raw value.

**Options:**
- Server-side sessions with an HTTP-only cookie.
- Self-contained bearer tokens.
- Bearer tokens with a separate revocation mechanism.

**Why this one:** Server-side sessions make logout and session revocation explicit. The browser does not need to manage a token in application JavaScript. The trade-off is an additional database lookup and session-table maintenance.

**Risks:**
- Stolen session identifiers can be abused until revoked or expired.
- Incorrect cookie or CORS settings can break authentication.
- Cookie-based authentication requires CSRF protection.
- Expired sessions must be rejected consistently.

**Session policy:** Seven-day absolute expiry for the initial version. Logout revokes the current session. Session renewal and revocation of all sessions for an account will be addressed explicitly before release.

**Test proving it:** Integration tests will prove that valid sessions authenticate protected requests, invalid/expired/revoked sessions are rejected, and logout invalidates the current session.

**Related requirements:** P0-01 account/session identity; preserve the existing API error envelope and request-ID behavior.