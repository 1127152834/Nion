# Notebook System Implementation Plan

## Goal

Turn the notebook research package into an ordered, buildable implementation plan for Nion's personal desktop second-brain notebook system.

This plan assumes the notebook root is:

- `~/.nion-data/notebook`

and that notebook retrieval for agents will later be handled through OpenViking-compatible ingest.

## Requirements Summary

The first implementation slice should deliver:

- a notebook root owned by the user
- Markdown notes with stable frontmatter identity
- notebook authoring flows that feel simple and direct
- agent-assisted editing under intent-based authorization
- version history and rollback
- delete confirmation and recoverable delete
- a notebook ingest bridge contract for future OpenViking retrieval

## Acceptance Criteria

- notebook root is created and recognized at `~/.nion-data/notebook`
- notes are stored as plain `.md` files with required frontmatter
- notebook folder structure remains user-defined
- attachments created by Nion use the note-local hidden asset strategy
- users can create, edit, append, rename, move, and delete notes through notebook workflows
- ordinary edits apply directly and generate history entries
- delete always requires explicit confirmation
- rollback restores earlier versions as new head versions
- notebook operational metadata is stored outside note content
- notebook files remain editable outside Nion
- the implementation creates a clean handoff point for OpenViking ingest

## Module Breakdown

### Module 1: Notebook Path And Domain Model

**Purpose**

Introduce notebook as a first-class app asset next to existing workspace/memory/thread paths.

**Scope**

- add notebook root resolution to the backend path layer
- define note metadata/frontmatter contract
- define notebook-specific domain types in frontend and backend

**Primary Touchpoints**

- [paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py)
- notebook domain models to be created under backend/frontend notebook modules

**Deliverables**

- notebook root resolver
- note metadata contract
- note identity helpers

**Verification**

- unit tests for path resolution
- unit tests for note id/frontmatter parsing

### Module 2: Notebook Storage Service

**Purpose**

Create the backend service that reads, writes, moves, renames, and deletes notebook files safely.

**Scope**

- CRUD-like note operations
- frontmatter creation/update
- attachment placement helper
- external-edit-aware write flow

**Expected Behavior**

- intent-level requests can resolve to note operations
- note writes re-read latest file state before applying
- note rename and move preserve stable note identity

**Primary Touchpoints**

- new backend notebook service module
- filesystem helpers

**Deliverables**

- notebook service
- conflict detection rules
- note/attachment write helpers

**Verification**

- unit tests for create/edit/rename/move
- unit tests for external-edit conflict detection
- unit tests for attachment placement

### Module 3: Notebook History And Trash Service

**Purpose**

Implement version history, rollback, and recoverable delete.

**Scope**

- diff-oriented note history timeline
- restore-as-new-version semantics
- notebook trash
- delete confirmation payload model

**Recommended Storage**

- hidden notebook metadata root under `~/.nion-data/notebook/.nion/`

**Primary Touchpoints**

- new notebook history service
- metadata storage under notebook root

**Deliverables**

- history record store
- rollback service
- trash / restore service
- delete metadata contract

**Verification**

- unit tests for append-only history
- unit tests for restore creating a new version
- unit tests for delete -> trash
- unit tests for restore from trash

### Module 4: Notebook API Layer

**Purpose**

Expose notebook operations to the desktop frontend through the daemon/gateway API surface.

**Scope**

- list notebook tree
- load note content
- create note
- update note
- rename/move note
- note history
- restore note version
- request delete metadata
- confirm delete
- restore deleted note

**Implementation Note**

The existing thread files router is a useful structural reference, but notebook needs its own root and semantics.

Reference:

- [files.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/files.py)

**Deliverables**

- notebook router(s)
- request/response schemas

**Verification**

- API tests for all notebook endpoints
- path safety tests
- delete confirmation tests

### Module 5: Notebook Frontend Data Layer

**Purpose**

Add frontend APIs/hooks/types for notebook operations.

**Scope**

- notebook tree hooks
- note content hooks
- mutation hooks
- history hooks
- delete/restore hooks

**Deliverables**

- `frontend/src/core/notebook/*`

**Verification**

- API unit tests where appropriate
- query invalidation behavior tests

### Module 6: Notebook Shell UI

**Purpose**

Ship the first notebook user interface inside desktop workspace.

**Scope**

- notebook entry point in workspace nav
- notebook home
- note editor shell
- attachment insertion affordance
- history drawer
- delete confirmation card

**Existing Reusable UI**

- [ConfirmActionDialog](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/confirm-action-dialog.tsx)
- existing file tree and workspace layout patterns
- existing code/editor shell components

**Deliverables**

- notebook navigation entry
- notebook page route
- note editor and side surfaces

**Verification**

- component tests or structure tests where available
- manual UX verification checklist

### Module 7: Agent-Assisted Authoring Contract

**Purpose**

Bridge chat/agent flows into notebook writing without making notebook mutation autonomous.

**Scope**

- create note from chat
- append to note from chat
- ask agent to rewrite note or selection
- semantic target resolution rules
- ambiguity follow-up rules

**Deliverables**

- notebook authoring action contract
- agent-side request shape and mutation boundaries

**Verification**

- tests for target ambiguity handling
- tests for direct-apply authorized mutations
- tests for delete confirmation path

### Module 8: Notebook → OpenViking Ingest Bridge

**Purpose**

Prepare notebook resources for future agent retrieval.

**Scope**

- snapshot scan
- watch mode
- reconciliation pass
- note/resource metadata mapping
- attachment resource ingest

**Deliverables**

- ingest state model
- notebook resource mapper
- background ingest trigger path

**Verification**

- ingest tests for create/modify/rename/move/delete
- provenance tests
- ignored-path tests

## Sequencing

### Wave 1: Foundations

1. Module 1: Notebook Path And Domain Model
2. Module 2: Notebook Storage Service
3. Module 3: Notebook History And Trash Service

These modules define the core truth model.

### Wave 2: Product Surface

4. Module 4: Notebook API Layer
5. Module 5: Notebook Frontend Data Layer
6. Module 6: Notebook Shell UI

These modules make notebook visible and usable.

### Wave 3: Agent Integration

7. Module 7: Agent-Assisted Authoring Contract
8. Module 8: Notebook → OpenViking Ingest Bridge

These modules connect notebook to the rest of Nion's intelligence stack.

## Suggested v1 Delivery Slice

If we want the smallest credible v1:

### v1

- Module 1
- Module 2
- Module 3
- Module 4
- Module 5
- minimal subset of Module 6

Specifically:

- notebook tree
- open note
- create note
- edit note
- rename/move
- history
- rollback
- delete confirm + trash

### v1.5

- richer attachment flows
- chat -> note creation
- note-targeted agent rewrite

### v2

- notebook → OpenViking ingest bridge
- semantic notebook retrieval for agent
- richer authoring actions

## Risks And Mitigations

### Risk: External Editor Conflicts

Mitigation:

- re-read before apply
- content hash guard
- conflict follow-up when unsafe

### Risk: Hidden Metadata Sprawl

Mitigation:

- keep all operational metadata under `.nion/`
- never leak it into note content

### Risk: Link Breakage On Move/Rename

Mitigation:

- preserve note `id`
- track rename/move as first-class operations
- defer full link maintenance only if explicitly documented

### Risk: Too Much Scope In v1

Mitigation:

- keep notebook retrieval for agents out of v1 user feature work
- defer OpenViking ingest bridge if needed

### Risk: Trust Loss From Agent Direct Writes

Mitigation:

- append-only history
- visible attribution
- explicit rollback
- explicit delete confirmation

## Verification Steps

- backend unit tests for notebook path/model/storage/history/trash
- backend API tests for notebook endpoints
- frontend typecheck
- frontend lint
- targeted notebook component tests or structure tests
- manual desktop verification for:
  - create note
  - edit note
  - rename/move
  - inspect history
  - restore version
  - delete with confirm
  - restore from trash

## Recommended Immediate Next Step

Write the first execution-spec plan for **Wave 1** only:

- Module 1
- Module 2
- Module 3

Do not start UI work before the notebook truth model, history model, and delete/trash semantics are implemented.
