# Notebook History, Rollback, and Delete Spec v1

## Goal

Define the v1 product and storage contract for:

- note history
- rollback
- delete confirmation
- delete recovery
- notebook mutation safety under direct-apply agent edits

This spec assumes the storage contract from:

- [Notebook Storage Spec v1](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-26-notebook-storage-spec-v1.md)

## Scope

This spec covers:

- how notebook edits produce history
- how users inspect history
- how rollback works
- how delete behaves
- how delete differs from normal edits

This spec does **not** cover:

- notebook search UX
- notebook graph UX
- multi-device sync
- block-level editing or block-level version history
- OpenViking retrieval implementation

## Principles

1. Normal notebook edits should apply directly once user intent is clear.
2. Direct apply must never mean irreversible apply.
3. History must be attributable and inspectable.
4. Rollback must be user-driven and explicit.
5. Delete is a special destructive action and must require confirmation.
6. Notebook files remain user-owned; history machinery must not make the notebook unreadable outside Nion.

## High-Level UX Contract

### Ordinary Edit

Flow:

1. user asks the agent to create or modify notebook content
2. agent resolves the target note
3. agent applies the edit directly
4. system records a version entry
5. user can later inspect history and roll back

No extra confirmation is required for ordinary note creation or modification when user intent is already clear.

### Delete

Flow:

1. user asks to delete a note
2. system shows a destructive confirmation card
3. user confirms
4. system performs a recoverable delete
5. system records the delete in history

Delete must never follow the same direct-apply path as a normal edit.

## History Model

### User-Facing Model

History should feel like a code-style timeline:

- newest change first
- each entry shows who changed it
- each entry shows when it changed
- each entry shows what kind of change happened
- the user can inspect the change and roll back

The product does not need to expose git jargon. It only needs to expose:

- timeline
- changed content summary
- compare
- restore this version

### Storage Model

The user chose a diff-oriented history model.

That means v1 should store notebook history as:

- a version timeline
- content diffs or patch payloads between versions
- metadata events for rename, move, attachment, and delete operations

The user-facing contract is diff history, but the implementation may still use periodic checkpoints internally for performance and recovery.

Recommended implementation direction:

- diff-first logical model
- optional internal checkpoints every N versions for fast reconstruction

## Hidden Notebook Metadata Area

Notebook documents remain plain Markdown files.

Operational notebook metadata should live under a hidden notebook-internal control folder:

`~/.nion-data/notebook/.nion/`

Recommended subpaths:

```text
~/.nion-data/notebook/.nion/
  history/
  trash/
  locks/
  index/
```

This folder is not user note content, but it should live inside the notebook root so that notebook backups and migrations can remain self-contained.

## Version Identity

Each history entry should have:

- `version_id`
- `note_id`
- `parent_version_id`
- `timestamp`
- `actor_type`
- `actor_id` if available
- `operation`
- `path_at_time`
- `content_hash_after`
- `patch_ref` or inline diff payload

### Actor Types

- `user`
- `agent`
- `system`

### Operations

- `create`
- `edit`
- `metadata_edit`
- `rename`
- `move`
- `attachment_add`
- `attachment_remove`
- `attachment_move`
- `delete`
- `restore`

## Attribution

Agent edits must always be attributable in history.

Minimum requirement:

- this change was made by the agent
- timestamp
- target note
- operation type

Preferred future extension:

- causal link to the triggering user instruction
- model / runtime metadata

## Compare And Rollback

### Compare

Users should be able to compare:

- current note vs selected history entry
- adjacent history entries

The compare view may be line-based in v1.

Markdown awareness is useful, but not required for the first version.

### Rollback

Rollback must not erase history.

Recommended rollback semantics:

- rollback creates a **new** version entry
- the new version restores content from a chosen previous point
- previous history remains intact

This is safer than destructive rewind because it preserves a full audit trail.

### Rollback Entry Example

If version `v8` is restored back to `v3`, the system creates `v9`:

- operation: `restore`
- parent: `v8`
- restored_from: `v3`

The timeline remains append-only from the user's perspective.

## Rename And Move

Rename and move are not just filesystem events; they are note-history events.

Rules:

- note `id` remains stable
- rename creates a history entry
- move creates a history entry
- links should be updated according to the future link-management contract, but even if links are deferred, the history entry must still exist

## External Edit Concurrency

Because notebook files are editable outside Nion, history must tolerate concurrent edits.

Required write safety behavior:

1. Before apply, re-read the latest note state.
2. Compare the current content hash with the hash used when the agent prepared the change.
3. If unchanged, apply directly.
4. If changed, either:
   - rebase the edit automatically if safe, or
   - ask the user a follow-up if the target became ambiguous or the merge is risky

The system must not silently overwrite newer external edits.

### Minimum Conflict Signals

- file content changed externally
- file moved or renamed externally
- file deleted externally

## Delete Contract

### User-Facing Rule

Delete always requires explicit confirmation.

The user may express delete intent in natural language, but the system must still show a confirm step.

### Confirmation Card

The delete confirmation card should include:

- note title
- short note preview or summary
- path
- destructive action label
- cancel action

Recommended copy direction:

- "Delete this note?"
- note title
- one- or two-line summary
- warning that the note can still be recovered from trash/history if that behavior exists

## Recoverable Delete

Delete should be recoverable in v1.

Recommended strategy:

- confirmed delete moves the note into notebook trash instead of immediately purging it
- attachments should move with it or remain logically linked through tombstone metadata
- a delete history entry is recorded

Recommended trash path:

`~/.nion-data/notebook/.nion/trash/<note-id>/`

Recommended tombstone metadata:

- original path
- deleted_at
- deleted_by
- note title
- note id
- latest version id before delete

## Purge

Permanent purge is not part of the default delete action.

If purge exists later, it should be a separate, higher-friction operation.

## Attachment History

Attachment operations should also be visible in note history when they are note-scoped.

Minimum requirement:

- attachment add
- attachment remove
- attachment move

The first version does not need binary diffing.
It only needs event-level history for attachments.

## Recovery Guarantees

v1 should guarantee:

- every non-delete mutation creates a recoverable history entry
- rollback does not destroy prior history
- delete requires explicit confirmation
- delete is recoverable through trash/history

v1 does not need to guarantee:

- infinite retention
- block-level rollback
- binary attachment diffing
- collaborative multi-user merge histories

## Recommended UI Surfaces

v1 should eventually expose:

1. **History timeline**
   - list of changes
   - timestamp
   - actor
   - operation

2. **Compare view**
   - current vs selected version

3. **Restore action**
   - restore selected version as a new head version

4. **Delete confirmation card**
   - title
   - summary
   - path
   - confirm/cancel

5. **Trash / restore**
   - view deleted note
   - restore it

## Acceptance Criteria

- normal notebook edits apply directly after user intent is clear
- every normal edit creates a history entry
- history is append-only from the user's perspective
- rollback creates a new restore version instead of erasing intermediate history
- rename and move are recorded as history events
- delete requires explicit confirmation
- delete is recoverable in v1
- notebook operational metadata stays hidden from normal note content
- external editor changes are not silently overwritten
