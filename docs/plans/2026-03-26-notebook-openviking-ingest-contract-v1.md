# Notebook → OpenViking Ingest Contract v1

## Goal

Define how user-owned notebook content under:

`~/.nion-data/notebook`

is exposed to the agent-side retrieval system through an OpenViking-compatible ingest pipeline.

This contract is only about:

- what gets ingested
- how notebook files map into OpenViking resource space
- how updates, renames, moves, and deletes propagate
- how provenance is preserved
- how agent retrieval should consume notebook-derived resources

This contract does **not** define:

- user-facing notebook search UX
- notebook editing UX
- OpenViking engine embedding details
- memory extraction from notebook into user memory
- diary extraction

## Design Position

Notebook content is a **Resource**, not a Memory.

This aligns with OpenViking's own context model:

- `Resource` = user-added knowledge
- `Memory` = agent-recorded cognition
- `Skill` = callable capability

Therefore, notebook ingest must never collapse user notes directly into memory storage.

## Principles

1. Notebook stays the source of truth.
2. OpenViking ingest is one-way in v1.
3. Notebook content enters retrieval space as `Resource`.
4. User directory structure is semantically meaningful and should be preserved where possible.
5. Stable note identity must survive rename and move.
6. Agent retrieval must preserve provenance back to notebook files.

## Ingest Scope

### Included

- Markdown note files under `~/.nion-data/notebook`
- note metadata from frontmatter
- note-local attachments when relevant to retrieval
- folder hierarchy as navigational structure

### Excluded

- notebook operational metadata under `.nion/`
- notebook history internals
- trash internals
- transient editor locks
- agent memory
- agent journal

## Ingest Modes

### Recommended v1 Strategy

Use a **hybrid ingest model**:

1. **Initial snapshot scan**
   - full walk of notebook root on startup or root registration

2. **Incremental watch mode**
   - filesystem watcher listens for create / modify / rename / move / delete

3. **Periodic reconciliation**
   - scheduled rescan to repair watcher misses or external-edit race conditions

This is better than watcher-only or snapshot-only.

### Why

- users will edit notes outside Nion
- external editors and sync tools can produce rename/move edge cases
- watcher-only systems drift silently
- snapshot-only systems feel stale

## Context Type Mapping

### Notebook Notes

Notebook notes must map into:

- `viking://resources/notebook/...`

### Notebook Attachments

Attachments should also enter resource space when they are retrieval-relevant.

Examples:

- PDF under a note
- image under a note
- exported document attached to a note

Attachments are resources, not memories.

### Non-Notebook Memory

Do not write notebook notes into:

- `viking://user/memories/`
- `viking://agent/memories/`

unless a later promotion pipeline explicitly derives memory from notebook usage or repeated facts.

## URI Contract

### Core Tension

There are two conflicting goals:

1. preserve user folder hierarchy for recursive retrieval
2. preserve stable identity through note renames and moves

### Recommended v1 Resolution

Use:

- **stable logical identity** = note frontmatter `id`
- **path-oriented resource location** = notebook relative path projection

In practice:

- retrieval-visible resource hierarchy mirrors notebook structure
- ingest state tracks stable note identity separately

### Required Metadata

Every ingested notebook resource must carry:

- `note_id`
- `source_root`
- `source_relative_path`
- `source_absolute_path`
- `source_kind` (`note` or `attachment`)
- `title`
- `updated_at`
- `content_hash`

### Path Preservation Rule

If a note lives at:

`~/.nion-data/notebook/projects/alpha/roadmap.md`

its resource placement should preserve the path semantics in OpenViking resource space.

The exact internal URI slugging may vary, but the hierarchy should still reflect:

- `projects`
- `alpha`
- `roadmap`

### Stable Identity Rule

Rename or move must not create a new logical note identity.

The ingest system must use `note_id` to recognize:

- this is the same note
- path changed
- resource placement and metadata need refresh

## L0 / L1 / L2 Mapping

OpenViking uses:

- `L0` `.abstract.md`
- `L1` `.overview.md`
- `L2` original content/subdirs

For notebook ingest:

### L2

L2 for a note is the original Markdown file content.

For attachments:

- L2 is the original file
- if binary, ingest should still create text summaries for upper layers

### L1

L1 should summarize:

- note title
- note topic
- key sections
- related attachments
- how to access the underlying note

### L0

L0 should be a short abstract for fast filtering.

## Folder Semantics

The user's notebook tree is meaningful and should participate in retrieval.

That means OpenViking ingest should preserve directory recursion so the agent can reason at:

- notebook-root level
- folder level
- note level
- attachment level

The folder hierarchy should help the agent narrow search before reading full note content.

## Provenance Contract

Every notebook-derived retrieval result must be able to answer:

- which note or attachment it came from
- where that file lives in notebook
- what kind of source it is
- how fresh it is

### Minimum Provenance Fields

- `uri`
- `note_id`
- `source_relative_path`
- `title`
- `updated_at`
- `content_hash`

### Retrieval Presentation Requirement

Agent retrieval should be able to distinguish notebook-derived resource context from:

- conversation recall
- user memory
- agent memory
- agent journal

Notebook is not just "another memory chunk."

## Update Semantics

### Create

When a new notebook note appears:

- assign or read `note_id`
- ingest as resource
- generate/update L0/L1

### Modify

When note content changes:

- recompute content hash
- refresh L0/L1
- keep logical identity

### Rename

When filename changes:

- preserve `note_id`
- update path metadata
- update resource hierarchy placement
- keep provenance chain

### Move

When directory changes:

- preserve `note_id`
- update path metadata
- update resource hierarchy placement
- keep provenance chain

### Delete

If note is moved into notebook trash:

- resource should stop appearing in normal active retrieval scope
- deletion state should be reflected in ingest metadata
- restore should re-activate the same logical note identity

If note is permanently purged later:

- resource may be fully removed from active resource space
- optional tombstone metadata may remain for audit / stale-reference cleanup

## Attachment Semantics

### Default Rule

Attachments under:

`.assets/<note-id>/`

belong to that note unless explicitly detached later.

### Ingest Rule

The ingest layer should understand note-local attachments as child resources of the note context.

This makes it possible for agent retrieval to answer from:

- the note itself
- an attached PDF
- an attached image summary

without flattening all attachments into one global bucket.

## Ignore Rules

The ingest layer must ignore:

- `.nion/history/`
- `.nion/trash/`
- `.nion/locks/`
- `.nion/index/`
- temporary editor files
- system junk files

Recommended examples:

- `.DS_Store`
- `Thumbs.db`
- swap files
- temp lock files

## Concurrency And Freshness

The ingest system must support external editing.

### Freshness Rules

- notebook writes should enqueue ingest refresh quickly
- external edits detected by watcher should enqueue refresh
- periodic reconciliation should repair stale state

### Safety Rule

OpenViking-derived retrieval context must never silently become the write source of notebook content.

Notebook is read into retrieval space, not round-tripped back automatically.

## Recommended v1 Retrieval Consumption

Even though this spec does not design search UX, it should constrain agent retrieval behavior.

Recommended retrieval order when notebook is relevant:

1. search notebook resources at folder/note level using OpenViking
2. load L1 overview first
3. only load L2 original note or attachment content when needed

This keeps token use bounded while preserving notebook fidelity.

## Suggested Ingest State Storage

The notebook remains user-owned.

The ingest system may maintain its own state outside the notebook content itself.

Recommended host-side state:

- `~/.nion-data/openviking/` if OpenViking is embedded later
- or another agent-owned state root outside notebook

This ingest state may track:

- note_id -> current path
- last content hash
- last indexed time
- watcher checkpoint
- trash / active status

## v1 Non-Goals

This contract does not require:

- semantic memory extraction from notes
- automatic note summarization visible to user
- notebook graph UI
- notebook block references
- bidirectional sync back from OpenViking to notebook

## Acceptance Criteria

- notebook notes ingest as `Resource`, not `Memory`
- notebook root is scanned via snapshot + watch + reconciliation strategy
- note identity survives rename/move via frontmatter `id`
- resource results preserve notebook provenance
- note-local attachments can be ingested as child resources
- `.nion/` operational folders are excluded from retrieval ingest
- delete/trash semantics are reflected in active retrieval scope
- agent retrieval uses notebook L1 first and L2 on demand
- ingest is one-way; OpenViking does not silently mutate notebook files
