# Decision 05 — Owned Content Lifecycle

**Status:** Recorded from the P0-05 implementation  
**Feature:** JS-P0-05 — Owned-content lifecycle

## Decision

Use **soft deletion** for posts. Deletion records `deleted_at` and retains the post row so references and conversation relationships are not destroyed by a hard delete. Repeating a delete by the owner is safe and returns the deleted state.

Allow the author to edit eligible original/reply text within **30 minutes** of creation. Reposts are not editable because they have no independent text. Use optimistic concurrency with a `version` field: the client supplies the expected version, and the update succeeds only when the stored version still matches. A successful edit increments the version and records `is_edited` and `edited_at`.

Only the author may edit or delete their post. The author identity comes from the authenticated session.

## Options considered

- **Selected:** Soft delete plus a 30-minute edit window and version-based optimistic concurrency.
- Hard-delete the post row.
- Retain deleted posts as a visible tombstone with replacement text.
- Allow edits indefinitely or use last-write-wins without a version check.

## Why this decision

Soft deletion preserves references and supports consistent handling of replies, reposts, likes, media, and notifications. A bounded edit window limits how long content can change after readers have seen it. Optimistic concurrency prevents a stale edit from silently overwriting a newer edit. The conditional update checks author, expected version, non-deleted state, edit deadline, and post kind at write time.

## Implementation references

- `src/database/schema/posts.ts`
  - `version` with default `1` and a `version >= 1` check.
  - `deletedAt`, `isEdited`, and `editedAt`.
  - Reply/repost foreign keys use restrictive deletion behavior.
- `src/data/repository/drizzle-social-feed.repository.ts`
  - `updatePost` checks ownership, deletion state, kind, edit deadline, and expected version; the update uses a conditional version check.
  - `deletePost` verifies ownership and sets `deletedAt`.
  - Read queries should filter deleted posts where appropriate.
- `src/posts/posts.service.ts` and `src/posts/posts.controller.ts` — post service/API boundary. Confirm edit/delete endpoints and DTO validation on the branch before relying on these as complete route references.
- `drizzle/0004_clammy_madame_masque.sql` — migration adding lifecycle fields and the version constraint.

## Invariants

- The authenticated actor is the author for creation and the owner check for edit/delete; clients cannot choose an arbitrary author.
- Only the author can edit or delete a post.
- Only eligible non-repost content can be edited.
- Edits are allowed only within the 30-minute window.
- A stale expected version cannot overwrite a newer edit.
- A successful edit increments `version` and updates edit metadata.
- Deleted content is excluded from applicable read surfaces.
- Repeated deletion by the owner is safe.
- Reply/repost references must not become unexplained broken references.

## Risks and limitations

- Soft deletion is only consistent if every relevant read surface filters deleted posts or deliberately renders a tombstone.
- Likes, media, replies, reposts, and notifications need an explicit policy when their referenced post is deleted.
- The version check must be enforced in the database update predicate; a service-only comparison is vulnerable to races.
- A multi-step read/check/write deletion flow should be reviewed for races with concurrent operations.
- Do not claim the entire nine-surface deletion acceptance test passes until an end-to-end test verifies each surface.

## Tests proving it

Link or add tests for:
- A non-owner cannot edit/delete another user's post and database state remains unchanged.
- Editing after 30 minutes is rejected.
- Reposts cannot be edited.
- A successful edit increments version and updates edit metadata.
- Two edits using the same expected version cannot both succeed.
- Deleted posts are absent or represented according to policy on detail, feed, search, replies, reposts, likes, media, bookmarks, and notifications as applicable.
- Repeated delete is safe.
- Deleting a referenced original leaves replies/reposts explainable and does not violate foreign-key constraints.

## Review note

The inspected P0-05 schema and repository implement lifecycle fields, a 30-minute edit window, version-checked updates, and soft deletion. Confirm the route/DTO coverage and the full cross-surface deletion behavior with tests before treating P0-05 as accepted.
