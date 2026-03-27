# Notebook V1 Product Blueprint

## Purpose

Define the top-level product blueprint for Nion's notebook line so implementation stops drifting between:

- a generic note CRUD tool
- a file browser
- a memory product
- an agent workspace

Notebook V1 should instead be one coherent product:

**a local-first, user-owned document knowledge base that feels calm to write in, easy to organize, and safe to let the agent collaborate with.**

This blueprint is the layer above the existing storage, authoring, and UI parity specs.

It answers:

- what the notebook product is
- what its objects are
- how users mentally model it
- which flows are V1-critical
- where notebook stops and agent memory begins
- what must be specified now to avoid engineering rework

## Why This Blueprint Is Needed

Recent notebook work exposed a pattern:

- UI parity alone is not enough
- dialog polish alone is not enough
- backend CRUD alone is not enough

The product was still missing stable rules for:

- folders vs paths
- notebook vs agent memory
- quick capture vs note creation
- direct agent edits vs preview-first editing
- folder management scope in V1

Without this layer, each feature gets re-decided locally and the module drifts.

## Product Thesis

Notebook is the user's personal desktop second brain.

It is for:

- writing and organizing explicit knowledge
- maintaining project pages, research pages, personal notes, and dossiers
- turning useful chat output into durable user-owned notes
- letting the agent help draft, refine, import, and organize content

It is not:

- the agent's diary
- the agent's long-term memory store
- a hidden database
- a chat export dump
- a generic file manager

The notebook product should make users feel:

- "this is my knowledge base"
- "I can find and reshape my notes easily"
- "the agent can help, but I stay in control"
- "nothing important disappears because history and trash exist"

## Product Boundaries

Notebook must stay separate from three other systems:

### 1. User Notebook

Explicit user-authored resources.

Examples:

- work notes
- project notes
- employee pages
- research collections
- life notes

### 2. User Memory

Agent-extracted facts about the user.

Examples:

- preferences
- recurring decisions
- stable entities

This is not the same as a notebook page.

### 3. Agent Memory And Diary

The agent's own learned operational patterns, reflections, unresolved questions, and diary.

This must not be mixed into notebook content automatically.

### Boundary Rule

Notebook is **user-owned resource space**.
Memory and diary are **agent cognition space**.

OpenViking may later retrieve across all of them, but retrieval unification must not erase the ownership boundary.

## Core Objects

Notebook V1 must formalize these objects.

### Notebook Root

One local notebook store rooted at:

`~/.nion-data/notebook`

This is the user's visible, editable knowledge base.

### Folder

A folder is the primary organization layer inside notebook.

Folder is:

- a human organization destination
- visible in the notebook tree
- usable as a place to create or move notes into

Folder is not yet:

- a rich domain object with properties, permissions, and analytics

### Note

The primary content object.

A note is:

- Markdown-first
- user-readable outside Nion
- identified by stable internal id
- movable and renameable without identity loss

### Metadata

V1 note metadata:

- title
- stable id
- created_at
- updated_at
- tags
- pin state
- summary

### Revision

An append-only historical version of a note.

Revision must support:

- timeline display
- snapshot preview
- restore without destructive overwrite of later history

### Trash Item

A deleted note that remains recoverable.

Trash must preserve:

- title
- prior location
- summary/content preview
- deletion time

### Agent Assist Output

Temporary content generated for note collaboration.

Examples:

- rewrite preview
- summary draft
- checklist extraction
- imported chat section

This content is not notebook content until it is applied.

## User Mental Model

The notebook mental model must be simple:

`Notebook -> Folder -> Note`

Users should think:

- "I open my notebook"
- "I browse folders"
- "I open or create a note"
- "I ask Nion to help with the current note"

Users should not think:

- "I need to input a relative path"
- "I am editing the filesystem"
- "I am choosing between notebook and memory stores"

The UI should hide storage mechanics and expose document organization instead.

## Product Principles

### 1. Writing First

The center of gravity is the note body, not admin controls.

### 2. Organize Without Filesystem Thinking

Users pick folders visually.
They do not type storage paths.

### 3. Speed First For Capture

Quick capture should optimize for getting ideas into the system fast.
Organization can happen after capture.

### 4. Safe Direct Agent Collaboration

The product does not need preview-first for every AI edit.
It needs **visible history, visible restore, and recoverable delete**.

### 5. Local-First Trust

Notebook content should remain understandable and editable outside Nion.

### 6. Calm Complexity

The product should feel like a knowledge workspace, not an operations console.

## Information Architecture

Notebook V1 should expose these first-class surfaces.

### A. Notebook Workbench

The main three-pane working surface.

- left: notebook navigation and organization
- center: writing/editor surface
- right: assist, history, and info

This is the primary product surface.

### B. Trash Surface

A full notebook sub-surface for recoverability.

### C. Create Note Dialog

Structured note creation.

### D. Quick Capture Dialog

Low-friction capture into inbox/default folder.

### E. Move / Folder Picker Surface

A reusable organization surface for choosing destination folders.

### F. Future Folder Management Controls

Integrated into the notebook tree, not a separate admin page.

## V1 Primary Navigation Model

### Left Rail Sections

The sidebar must model notebook-native navigation in this order:

1. Search
2. New note
3. Quick capture
4. Pinned notes
5. Recent notes
6. Full note tree
7. Trash

### Why This Order

- creation sits near the top
- high-frequency retrieval comes before full structure
- trash stays available but visually separate

## Core V1 User Jobs

Notebook V1 should optimize for these jobs:

1. Create a note quickly
2. Capture a thought quickly
3. Open the right note quickly
4. Continue writing in a stable editor
5. Move or reorganize notes without breaking identity
6. Turn chat output into notebook content
7. Ask the agent to improve a note
8. Inspect what changed
9. Restore a prior version
10. Delete without fear

## V1 Flows

### Flow 1: Create Note

Intent:

- create a new structured note

Interaction model:

- title
- save to folder
- optional seeded body

Rules:

- `保存到` uses a folder picker, not free-text path input
- default destination is current folder when context exists
- otherwise default to `收件箱`
- user may create note with or without starting content

### Flow 2: Quick Capture

Intent:

- dump information fast before it is lost

Interaction model:

- one large textarea
- one save action
- default destination helper

Rules:

- quick capture defaults to `收件箱`
- no title required upfront
- system derives title later from content
- organization can happen afterward

### Flow 3: Browse And Open

Intent:

- find the correct note

Interaction model:

- search
- pinned
- recent
- tree navigation

Rules:

- tree is the canonical organization view
- pinned and recent are retrieval shortcuts, not separate content silos

### Flow 4: Write And Edit

Intent:

- continue writing without friction

Interaction model:

- Markdown-first editor
- title editing
- autosave
- preview toggle
- visible note identity

Rules:

- save status must be visible
- path should be available but not dominant
- editor should feel like a writing canvas, not a form

### Flow 5: Organize

Intent:

- move notes into better places
- create folders when structure emerges

Interaction model:

- move note via folder picker
- create folder from tree
- create subfolder from folder row actions

Rules:

- organization should use notebook language, not path language
- V1 organization should be understandable from the sidebar alone

### Flow 6: Agent Assist

Intent:

- improve the current note with AI help

Interaction model:

- suggestion actions in right rail
- preview/apply flow when helpful
- import from chat
- open conversation using current note as context

Rules:

- AI may suggest or apply content
- history must capture the result
- the note remains the primary artifact, not the chat

### Flow 7: Review And Recover

Intent:

- trust the system after direct edits or mistakes

Interaction model:

- history timeline
- version preview
- restore action
- trash with restore

Rules:

- restore creates a new revision event
- delete goes to trash, not hard-delete
- destructive actions must be clearer than ordinary editing

## Folder Model

This is one of the most important decisions.

### Folder In V1

Folder is both:

- a navigation node
- a destination for note creation and moves

### Folder Is Not Yet

- a fully featured managed entity with custom metadata

### V1 Folder Operations

Must support:

- create folder
- create subfolder
- move note into folder

Should support if low-cost:

- rename folder
- delete empty folder

Should not support yet:

- bulk folder operations
- advanced folder settings
- per-folder AI policies

### Delete Rule

V1 should only allow deleting empty folders.

If a folder contains notes or subfolders:

- block deletion
- explain why

This is simple, safe, and easy to reason about.

## Inbox Model

`收件箱` should become a first-class notebook convention in V1.

Inbox is:

- the default landing place for quick capture
- the fallback destination when the user has not organized yet
- the easiest place to review and triage raw thoughts

Inbox is not:

- a hidden technical folder
- a chat transcript archive

This gives the notebook a stable capture behavior and reduces decision fatigue.

## Tag And Pin Model

Tags and pinning should remain lightweight in V1.

### Pin

Purpose:

- short-term retrieval priority

Used for:

- active project notes
- key reference pages

### Tag

Purpose:

- cross-folder categorization

Used for:

- people
- projects
- themes
- status labels

Tags should not replace folders.
Folders express structure.
Tags express cross-cutting labels.

## Agent Collaboration Rules

Notebook is a collaborative surface, but ownership rules must stay crisp.

### Allowed

- rewrite note content
- append new content
- summarize
- extract action items
- convert formats
- create notes from explicit user intent
- move notes when requested

### Allowed Because Recovery Exists

- direct apply for ordinary writing transforms

### Requires Explicit Confirmation

- destructive note deletion
- destructive folder deletion

### Must Stay Separate

- agent diary
- agent memory
- internal reasoning artifacts

The agent can work on the notebook.
The notebook should not silently become the agent's internal dump.

## Search And Retrieval Position

Notebook V1 is responsible for:

- storing
- writing
- organizing
- exposing inspectable note content

Notebook V1 is not responsible for solving final retrieval intelligence alone.

OpenViking-oriented retrieval should sit above notebook and other context stores.

That means:

- notebook should preserve clear structure and metadata
- OpenViking can later search across notebook, memory, diary, and history
- notebook does not need to become a full RAG product by itself in V1

## V1 Non-Goals

The following should explicitly stay out of V1 to reduce drift:

- backlinks graph
- semantic graph navigation
- block-based editor
- collaborative multi-user editing
- cloud sync
- attachment library management
- workflow generation UI
- notebook-wide analytics
- notebook replacing agent memory

## Required Backend Capability Envelope For V1

The blueprint implies this minimum backend envelope:

- notebook tree read
- note create/read/update/rename/move/delete-to-trash/restore
- metadata update for tags and pin state
- history timeline and snapshot detail
- assist preview/apply
- import content into current note
- create directory

Likely next additions:

- rename directory
- delete empty directory

## Recommended Delivery Order

### Wave 1: Product Correctness

- fix dialog semantics
- fix folder-picker semantics
- define inbox as default capture destination
- remove path-language from user flows

### Wave 2: Organization Completion

- add create-folder entry points in sidebar
- support create-directory backend
- add move-to-folder flow polish

### Wave 3: Recovery And Trust Completion

- finalize history preview
- finalize restore copy and behavior
- finalize trash surface and destructive confirmations

### Wave 4: Collaboration Completion

- finish assist rail behaviors
- tighten chat-to-note import and note-context conversation launch

## Top Ambiguity Traps To Avoid

1. Mixing notebook with memory
   If notebook pages and agent memory blur together, user trust drops immediately.

2. Treating folders like file paths
   If users are asked to type paths, the product feels like a developer tool.

3. Overloading quick capture
   If quick capture becomes a full form, it stops serving its actual purpose.

4. Under-specifying delete and restore
   If history and trash semantics are vague, direct agent edits will never feel safe.

5. Shipping partial folder management
   If the UI exposes organization intent but the backend cannot support it, the product feels fake.

## Final Product Statement

Notebook V1 should ship as:

**a writing-first, folder-organized, Markdown-based personal knowledge base with calm authoring, visible recovery, and agent-assisted refinement.**

If a feature does not strengthen one of these four properties:

- write
- organize
- recover
- collaborate

it should probably not be part of Notebook V1.
