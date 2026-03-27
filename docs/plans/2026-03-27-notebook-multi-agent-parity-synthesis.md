# Notebook Multi-Agent Parity Synthesis

## Purpose

This document is the single source of truth for the next notebook rebuild pass.

It merges three independent perspectives:

- product/business parity
- UI/layout/interaction parity
- backend/API/data-model parity

The target is strict parity with the local reference project:

- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook`

except for shell-theme adaptation where needed for Nion.

## Multi-Agent Verdict

### 1. Product Verdict

The current notebook implementation is **not** product-parity with the reference.

It is still a partial notebook workspace built around existing backend capabilities, while the reference is a **writing-first, three-pane notebook workbench** with strong notebook-native navigation and right-rail collaboration.

Core product gap:

- current implementation covers file-backed note CRUD, history, and trash
- current implementation does **not** yet cover the reference product behaviors that make the notebook feel like a collaborative knowledge workspace

### 2. UI Verdict

The current notebook implementation is **not** visually or interaction-wise one-to-one with the reference.

It has some of the right surfaces:

- three-pane shell
- notebook sidebar
- editor pane
- right context rail
- dialogs

But the actual layout composition, section order, affordances, and interaction details are still materially different from the reference.

### 3. Backend Verdict

The current backend is a strong foundation, but **insufficient for strict parity**.

What already exists is good:

- stable note identity
- CRUD
- rename/move
- conflict-safe updates
- append-only history
- recoverable trash
- tree listing

What is still missing:

- pinned notes
- tags
- history detail / snapshot preview endpoint
- assist preview/apply API
- current-note import/apply contract
- richer sidebar note summary contract
- attachment upload API

## What The Reference Product Actually Is

The reference is not “a note page”.

It is a **three-pane notebook workbench** built around these user jobs:

1. Find the right note quickly
2. Write continuously in the center pane
3. Use the right pane to collaborate with the agent, inspect history, and inspect note metadata
4. Capture thoughts fast into inbox
5. Trust direct edits because history and trash are visible

This means the rebuild must optimize for:

- writing flow
- notebook-native navigation
- visible collaboration
- visible recovery

not just CRUD correctness.

## One-To-One Gaps

### Left Pane

Reference requires:

- notebook branding
- search
- `新建` + `闪记`
- `已固定`
- `最近使用`
- `所有笔记`
- bottom trash row with count
- tree expand/collapse affordances
- note row hover affordances

Current state:

- search exists
- create exists
- quick capture exists
- recent exists
- tree exists
- trash exists
- `已固定` does not exist as real behavior
- hover affordances and density do not match

Verdict:

- structurally incomplete
- visually not reference-faithful

### Center Pane

Reference requires:

- path + last edited meta row
- large editable title
- inline save state text
- preview/edit toggle
- history button
- delete button
- more button
- freeform writing canvas
- preview mode
- floating toolbar

Current state:

- title exists
- preview toggle exists
- save exists
- history/delete exist
- more button missing
- header structure is different
- save state behavior is different
- writing canvas still not visually the same
- floating toolbar missing

Verdict:

- partially aligned
- still not one-to-one

### Right Pane

Reference requires:

- three true tabs: `Ask Nion / 历史 / 信息`
- ask tab:
  - suggestion cards
  - import-from-chat card
  - start-conversation card
  - preview/apply state
- history tab:
  - timeline cards
  - version preview
  - restore guidance
- info tab:
  - properties
  - tags
  - path

Current state:

- tabs exist
- ask exists only as action buttons
- no preview/apply flow
- no reference-style import-from-chat card
- no reference-style start-conversation card
- history is engineering-oriented rather than reference timeline UX
- info lacks tags and reference-style property grouping

Verdict:

- biggest remaining product gap

### Trash

Reference requires:

- reference-style trash hero/header
- centered empty state
- deleted note cards with richer context
- optional stronger trash actions

Current state:

- trash route exists
- restore works
- visual structure still differs

Verdict:

- function exists
- parity does not

### Dialogs

Reference requires:

- create modal with reference layout
- quick capture modal distinct from create
- delete dialog with reassuring recovery framing and note preview

Current state:

- create / quick capture / delete are split correctly
- behavior is closer
- visual and information structure still differs

Verdict:

- partially aligned
- still not one-to-one

## Non-Negotiable Backend Additions

These must exist before the UI can be called parity-complete.

### A. Note Metadata

Add to notebook note contract:

- `is_pinned: boolean`
- `tags: string[]`

Recommended supporting type:

- `NotebookNoteSummary`

Fields:

- `note_id`
- `title`
- `relative_path`
- `created_at`
- `updated_at`
- `is_pinned`
- `tags`
- `summary`

### B. Metadata Mutations

Add one of:

- `PATCH /api/notebook/notes/{note_id}/metadata`

or:

- `POST /pin`
- `POST /unpin`
- `POST /tags`

### C. History Detail

Add:

- `GET /api/notebook/notes/{note_id}/history/{version_id}`

Must return:

- title at that version
- content/body snapshot
- summary
- actor_type
- operation
- timestamp

### D. Assist Preview / Apply

Add:

- `POST /api/notebook/notes/{note_id}/assist-preview`
- `POST /api/notebook/notes/{note_id}/assist-apply`

Must support:

- summarize
- rewrite
- expand
- checklist
- action items

Must support apply modes:

- replace
- insert

Must record:

- `actor_type = "agent"`
- visible history summary

### E. Current-Note Chat Import

Add notebook-owned import/apply capability for current note:

- dedicated import endpoint, or
- reuse assist apply if generalized cleanly

### F. Attachment Upload Surface

Storage already exists.

Still needed:

- upload endpoint
- note attachment insertion flow

## Strict Acceptance Criteria

The next implementation pass is only done if all of these are true.

### Product

- notebook feels like a writing-first workbench, not CRUD inside cards
- direct edits remain trustworthy because history and trash stay visible
- current note can collaborate with agent inside the notebook page itself

### UI

- left pane section order matches the reference exactly
- center pane header and writing canvas match the reference closely
- right pane tabs and content areas match the reference closely
- trash page and dialogs match the reference closely
- no extra UI remains that has no reference counterpart unless required by real backend constraints

### Backend

- pinned and tags are real data, not placeholders
- history preview is snapshot-based, not diff-only
- assist preview/apply is real
- current-note import is real
- agent-originated notebook mutations are attributable in history

### Final Parity Check

Parity is judged against the reference project first, not against the current Nion notebook implementation.

If a feature exists in the reference but is only “approximately represented” in Nion, parity has not been reached.

## Recommended Execution Order

1. Backend metadata foundation
2. History detail endpoint
3. Assist preview/apply contract
4. Current-note import/apply contract
5. Attachment upload contract
6. Left pane rebuild to exact reference order/behavior
7. Center pane rebuild to exact reference structure
8. Right pane rebuild to exact reference structure
9. Trash/dialog parity pass
10. Final visual and interaction QA against reference

## Operating Rule For The Next Pass

Do not reinterpret the reference.

Do not “improve” the information architecture.

Do not keep current Nion UI structure unless the reference and backend contract already agree.

Copy the reference structure and behavior first.
Only adapt theme and shell integration second.
