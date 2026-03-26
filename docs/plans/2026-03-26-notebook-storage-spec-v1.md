# Notebook Storage Spec v1

## Goal

Define the v1 storage and write contract for Nion's personal desktop notebook system.

This spec is only about:

- where notebook data lives
- how notes and attachments are stored
- how note identity is maintained
- how agent-authored edits are authorized
- how history and rollback work
- how deletion is confirmed

This spec is **not** about:

- user-facing search UX
- OpenViking retrieval UX
- agent diary UX
- user memory UX
- workflow / skill generation UX

## Product Position

Notebook is a user-owned document knowledge base.

It is not:

- a hidden app database
- a thread-scoped sandbox output
- a replacement for agent memory
- a replacement for agent journal

Notebook content must remain usable and understandable outside Nion.

## Root Path

The notebook root is:

`~/.nion-data/notebook`

This path is the canonical user notebook root for v1.

Properties:

- user-visible
- user-editable outside Nion
- local-first
- desktop-native
- not tied to thread lifecycle

## Ownership Model

### User-Owned Assets

Everything under `~/.nion-data/notebook` is user-owned.

Examples:

- note files
- folder layout
- attachments
- user-authored frontmatter fields
- explicit links between notes

### Agent-Owned Assets

The following are not stored inside notebook:

- agent memory
- agent journal / diary
- workflow candidates
- internal retrieval cache
- OpenViking ingest state

These must remain separate from notebook content.

## Canonical Format

### Note Format

Each notebook document is a Markdown file:

`*.md`

Markdown is the canonical editable representation for v1.

### Note Identity

Each note has two identities:

1. Human identity
   - file path
   - file name

2. System identity
   - stable frontmatter `id`

Human-facing operations may refer to title/path semantics.
System-facing tracking, history, and references must rely on the stable `id`.

### Required Frontmatter

Each note should contain:

```md
---
id: note_20260326_xxxxx
title: My Note Title
created_at: 2026-03-26T12:00:00Z
updated_at: 2026-03-26T12:00:00Z
---
```

Required fields:

- `id`
- `title`
- `created_at`
- `updated_at`

Optional future fields:

- `tags`
- `aliases`
- `summary`
- `source`

### Title And Filename

`title` and filename are related but not identical.

Rules:

- filename should be human-readable
- title may diverge from filename if the user edits one but not the other
- internal note tracking must not break when filename changes
- rename operations must preserve `id`

## Directory Model

The notebook root is user-directed and unconstrained.

Nion does not enforce a fixed taxonomy like `daily/`, `work/`, `projects/`, or `life/`.

That means:

- users may create any folder structure
- Nion should adapt to the existing structure
- Nion may suggest structure, but must not impose it

## Attachments

### Design Goal

Attachment storage should be easy to maintain, local-file-safe, and readable outside Nion.

### Default Strategy

For new attachments created through Nion, store them under the current note directory using a hidden asset folder:

`<current-note-directory>/.assets/<note-id>/...`

Example:

```text
~/.nion-data/notebook/projects/alpha/roadmap.md
~/.nion-data/notebook/projects/alpha/.assets/note_20260326_abcd/diagram.png
~/.nion-data/notebook/projects/alpha/.assets/note_20260326_abcd/spec.pdf
```

### Why This Strategy

- keeps assets near the note they belong to
- avoids one giant global `assets/` dump
- avoids cluttering the visible note directory
- remains understandable in Finder and external editors
- stays stable even if the note filename changes, because the folder key is `note-id`

### Link Strategy

Markdown should use relative links.

Example:

```md
![](.assets/note_20260326_abcd/diagram.png)
```

### Existing User Files

Nion must not force-migrate the user's pre-existing attachment layout.

Rules:

- existing user structures stay as-is
- only new Nion-created attachments use the default storage rule
- agent edits should preserve valid existing relative links whenever possible

## Link And Reference Model

### v1 Scope

v1 is document-level first.

That means:

- one Markdown file is one note
- links primarily point note-to-note or note-to-attachment
- block-level editing is out of scope for v1

### Future Extension

The model should reserve space for block anchors later, but block storage and history are not part of this spec.

## Agent Authorization Model

### Core Rule

Notebook writes are **intent-authorized**, not path-authorized.

The user does not need to provide:

- an exact path
- an exact filename
- a low-level file operation command

If the user clearly expresses notebook-editing intent, the agent may:

- locate the target note
- choose the reasonable file path
- create a new note if the intent implies creation
- apply the requested edit directly

### Examples Of Sufficient Intent

- "帮我把这段整理成一篇新笔记"
- "找到我那篇 onboarding 的笔记并更新它"
- "在我的知识库里新增一个关于 LangGraph 的目录"
- "把今天这个会议总结写进我刚才那篇项目笔记里"

### When The Agent Must Ask A Follow-up

The agent must ask when:

- more than one note is a plausible target
- the requested operation is too broad
- the note cannot be located with confidence
- the requested action is destructive

### Direct-Apply Writes

The following may apply directly once user intent is clear:

- create note
- append to note
- rewrite selected parts of note
- add frontmatter fields
- add links
- add tags
- add attachments
- rename note
- move note

These do **not** require an extra confirmation step if user intent is already clear.

### Destructive Actions

The following must require explicit confirmation:

- delete note
- delete folder
- bulk delete
- destructive overwrite of many notes

## History And Rollback

### Design Goal

Normal notebook edits should apply directly, but never be irreversible.

### Model

History should behave like a git-style diff timeline.

The user should see:

- when a note changed
- what changed
- who changed it
- the ability to roll back to a previous point

The underlying implementation may store diffs, patches, or a diff-friendly history journal, but the product contract is:

- every non-delete notebook mutation creates a version record
- note history is browseable
- rollback is available by time/version

### Required History Fields

Each history record should capture:

- note `id`
- note path at time of change
- timestamp
- actor
  - user
  - agent
  - system-assisted
- operation type
  - create
  - edit
  - rename
  - move
  - metadata edit
  - attachment add
- diff payload reference

### Attribution

Agent-authored edits must be attributable.

At minimum, history should tell the user:

- this change was made by the agent
- when it happened
- which note changed

## Delete Confirmation

Delete is special.

Delete must never follow the same default path as ordinary edits.

### Required UX Contract

When the user asks to delete a note, the system should show a confirmation surface that includes:

- note title
- short summary or preview
- note path
- destructive confirmation action

Deletion should only happen after explicit user confirm.

### Recommended Semantics

For v1, prefer a two-step delete contract:

1. user asks to delete
2. system presents confirmation card
3. user confirms
4. note is deleted and the delete operation is recorded in history

## External Editing Compatibility

Because notebook files are user-owned, external editing is normal and expected.

The storage contract must therefore support:

- direct editing in Finder / Obsidian / VS Code / other editors
- file rename outside Nion
- file move outside Nion
- attachment changes outside Nion

### Required Safety Properties

- Nion must re-read the latest file state before applying agent changes
- stale drafts must not overwrite newer external edits silently
- path tracking must survive rename/move through stable note `id`
- broken-link detection should be possible later, but is not required in this spec

## Filesystem Portability Requirements

The storage layer must be designed with:

- case sensitivity differences
- Unicode filename normalization
- reserved names on Windows
- relative-path safety
- atomic write behavior
- crash recovery

This spec does not lock implementation details yet, but these risks are part of the required v1 storage design work.

## OpenViking Boundary

Notebook is the user-owned source layer.

OpenViking should later ingest notebook content for agent retrieval.

That contract is one-way in v1 planning:

- OpenViking may read notebook content
- OpenViking may index notebook content
- OpenViking may produce retrieval context from notebook content
- OpenViking may **not** silently mutate notebook content

Notebook remains the source of truth.

## v1 Non-Goals

This spec does not define:

- user-facing search interface
- notebook graph visualization
- block-level editing
- block-level history
- notebook sync architecture
- automatic agent journaling into notebook
- automatic skill creation from notes

## Acceptance Criteria

- notebook root is formally defined as `~/.nion-data/notebook`
- Markdown is the canonical note format
- every note has stable frontmatter `id`
- Nion respects arbitrary user folder structure
- new attachments follow the hidden per-note asset-folder rule
- normal edits are intent-authorized and can apply directly
- delete always requires explicit confirmation
- every non-delete mutation creates recoverable history
- notebook and agent assets remain contractually separate
