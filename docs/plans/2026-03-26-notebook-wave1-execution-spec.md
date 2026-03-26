# Notebook Wave 1 Execution Spec

## Goal

Implement the backend foundation for Nion's notebook system:

1. notebook path and domain model
2. notebook storage service
3. notebook history, rollback, and trash service

This wave deliberately excludes:

- notebook API routes
- notebook frontend
- notebook search UI
- OpenViking ingest runtime

## Why This Wave Comes First

The current repo already has a strong pattern for app-rooted storage under `Paths`, with `~/.nion-data` as the default base directory and existing host-side persisted assets like `memory.json`, `USER.md`, and thread-scoped user-data paths.[paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py#L15)

Wave 1 should extend that same foundation before any UI work.

The closest backend implementation patterns to reuse are:

- `Paths` path-contract style for app data roots and safety checks.[paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py#L38)
- `RuntimeProfileRepository` for file-backed repository shape and path/validation discipline.[repository.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/runtime_profile/repository.py#L61)
- `LocalRecallArchive` for small SQLite-backed append/query storage with local WAL mode and deterministic tests.[local_archive.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/recall/local_archive.py#L11)

## Architecture

### Module 1: Notebook Path And Domain Model

Create a notebook namespace under the app base directory:

```text
~/.nion-data/
  notebook/
    .nion/
      history.sqlite3
      history/
      trash/
      locks/
      index/
```

Notebook content itself stays outside `.nion/`.

Required path additions in `Paths`:

- `notebook_root_dir`
- `notebook_meta_dir`
- `notebook_history_dir`
- `notebook_trash_dir`
- `notebook_index_dir`
- `ensure_notebook_dirs()`

Domain model should include:

- note identity (`note_id`)
- note title
- relative path
- absolute path
- content hash
- timestamps

### Module 2: Notebook Storage Service

Create a notebook service that can:

- create a note
- read a note
- update a note
- rename a note
- move a note
- compute and validate content hashes
- preserve stable frontmatter `id`
- create note-local attachment directories

The service should treat notebook writes as:

- direct apply when user intent is already resolved
- conflict-checked against latest file content before apply

### Module 3: Notebook History / Rollback / Trash

Create a notebook history service that:

- records append-only note versions
- stores diff-oriented history entries
- supports restore-as-new-version
- supports recoverable delete via notebook trash

Recommended storage split:

- metadata timeline in SQLite
- patch/snapshot payloads in hidden notebook metadata dirs when needed

## Tech Constraints

- no new dependencies
- Markdown remains plain file content
- frontmatter parsing/writing should be implemented locally
- note history must remain append-only from the user's perspective
- delete must move to trash, not hard-delete immediately

## Files

### Modify

- [paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py)

### Create

- `backend/packages/harness/nion/notebook/__init__.py`
- `backend/packages/harness/nion/notebook/models.py`
- `backend/packages/harness/nion/notebook/frontmatter.py`
- `backend/packages/harness/nion/notebook/service.py`
- `backend/packages/harness/nion/notebook/history.py`
- `backend/tests/test_notebook_paths.py`
- `backend/tests/test_notebook_service.py`
- `backend/tests/test_notebook_history.py`

Optional split if implementation stays cleaner:

- `backend/packages/harness/nion/notebook/trash.py`
- `backend/packages/harness/nion/notebook/repository.py`

## Test-First Plan

### Step 1: Notebook Paths Tests

Create `backend/tests/test_notebook_paths.py`.

Write failing tests for:

- notebook root defaults to `~/.nion-data/notebook`
- notebook hidden metadata root is under `~/.nion-data/notebook/.nion`
- notebook history/trash/index dirs resolve correctly
- `ensure_notebook_dirs()` creates required dirs

Suggested assertions:

- `paths.notebook_root_dir == tmp_path / ".nion-data" / "notebook"`
- `paths.notebook_meta_dir == paths.notebook_root_dir / ".nion"`
- history/trash/index under `.nion`

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_paths.py -q
```

Expected: fail because notebook path APIs do not exist yet.

### Step 2: Implement Notebook Paths

Update [paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py) with notebook properties and `ensure_notebook_dirs()`.

Re-run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_paths.py -q
```

Expected: pass.

### Step 3: Notebook Service Tests

Create `backend/tests/test_notebook_service.py`.

Write failing tests for:

- create note writes Markdown with required frontmatter
- update note preserves `id` and updates `updated_at`
- rename note preserves `id`
- move note preserves `id`
- note attachments resolve to `.assets/<note-id>/`
- stale base hash blocks unsafe overwrite

Important scenarios:

1. Create note:
   - path chosen
   - file created
   - frontmatter inserted
   - human-readable filename

2. Update note:
   - body changes
   - `updated_at` changes
   - `created_at` stays stable

3. Rename/move:
   - note `id` unchanged
   - path changes

4. Conflict detection:
   - external file change after read should reject stale write

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_service.py -q
```

Expected: fail because notebook service does not exist yet.

### Step 4: Implement Frontmatter Helpers And Notebook Service

Implement:

- frontmatter read/write helpers
- note id generation
- title/filename normalization
- note create/read/update/rename/move operations
- conflict detection using content hash

Re-run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_service.py -q
```

Expected: pass.

### Step 5: Notebook History Tests

Create `backend/tests/test_notebook_history.py`.

Write failing tests for:

- create/edit generate append-only history entries
- restore creates a new version instead of rewinding
- delete moves note to trash
- restore from trash restores the same note identity
- rename and move create history entries
- note history tracks actor type and operation

Recommended scenarios:

1. Create -> edit -> restore
   - `v1 create`
   - `v2 edit`
   - restore `v1` creates `v3 restore`

2. Delete:
   - note moved to trash
   - delete entry recorded

3. Restore from trash:
   - note returns to active path
   - `note_id` unchanged

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_history.py -q
```

Expected: fail because history service does not exist yet.

### Step 6: Implement Notebook History / Trash Service

Implement a history service with:

- append-only timeline
- SQLite metadata table
- diff payload references
- restore-as-new-version behavior
- trash move/restore behavior

Recommended SQLite file:

- `~/.nion-data/notebook/.nion/history.sqlite3`

Recommended payload dirs:

- `~/.nion-data/notebook/.nion/history/<note-id>/`
- `~/.nion-data/notebook/.nion/trash/<note-id>/`

Re-run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_history.py -q
```

Expected: pass.

### Step 7: Wave 1 Regression Batch

Run all wave-1 tests together:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest \
  tests/test_notebook_paths.py \
  tests/test_notebook_service.py \
  tests/test_notebook_history.py \
  tests/test_paths_data_root.py \
  tests/test_runtime_profile_repository.py \
  tests/test_local_archive.py -q
```

Expected: pass.

## Recommended Internal Design Choices

### Frontmatter

Use a minimal internal frontmatter implementation instead of pulling in a dependency.

Required fields:

- `id`
- `title`
- `created_at`
- `updated_at`

### History Storage

Use hybrid storage:

- SQLite for version metadata and relationships
- patch files and optional checkpoints on disk

Why:

- easier append/query semantics
- repo already uses SQLite patterns successfully
- preserves notebook self-contained hidden metadata area

### Restore Semantics

Restore should always create a new head version.

Never destroy previous history during restore.

### Delete Semantics

Delete should:

1. move note to notebook trash
2. record delete event
3. preserve note `id`

Permanent purge is out of Wave 1.

## Risks

### Risk: Frontmatter Corruption

Mitigation:

- tests around read/write round trips
- only touch required fields in first version

### Risk: External Editor Conflicts

Mitigation:

- re-read before write
- compare content hash
- reject stale writes

### Risk: Diff Complexity

Mitigation:

- keep user-facing model diff-oriented
- allow implementation to use periodic checkpoints for reconstruction speed

### Risk: Hidden Metadata Leaks Into Notebook UX

Mitigation:

- all notebook operational files live under `.nion/`
- later tree APIs must explicitly ignore `.nion/`

## Done Definition For Wave 1

Wave 1 is done when:

- notebook root and metadata dirs exist under `~/.nion-data/notebook`
- note files are plain Markdown with stable frontmatter identity
- note operations preserve identity across rename/move
- history is append-only
- restore creates a new version
- delete is recoverable through trash
- all Wave 1 tests pass

## Recommended Next Step After This Spec

Execute **Step 1 through Step 2** first:

- write notebook path tests
- implement notebook path support

Do not start notebook UI or API work until those pass.
