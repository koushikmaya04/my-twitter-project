# Decision 02 — Profile and Account State

**Decision:** Members can update only their own permitted profile fields. Account deactivation is permanent and irreversible.

**Options considered:** Hard deletion; reversible soft deactivation; permanent soft deactivation.

**Why this one:** Permanent soft deactivation retains database relationships while preventing the account from being used again.

**Profile rules:**
- Handle changes are not allowed.
- Bio has a maximum length of 160 characters.
- Concurrent profile updates use last-write-wins.
- Only explicitly allowed fields can be updated.
- IDs, counts, timestamps, ownership, relationship state and unknown fields cannot be changed through profile updates.

**Deactivation rules:**
- A deactivated account cannot sign in again.
- Existing sessions are invalidated.
- No reactivation endpoint is provided.
- Profile and content visibility must be consistent across relevant read surfaces.
- The database record is retained; deactivation does not hard-delete the account.

**Risks:** Every relevant authentication and read path must enforce the deactivated state.

**Tests proving it:** Profile ownership, field validation, session invalidation and deactivated-account visibility tests.