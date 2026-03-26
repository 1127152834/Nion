# Personal Notebook KB Research Plan

## Task

Design the first research program for Nion's personal desktop second-brain notebook system.

This plan is intentionally narrower than the broader memory architecture work:

- focus on how notebooks are stored
- focus on how humans write and use notebooks comfortably
- treat retrieval as an agent concern that will later be handled through OpenViking

## RALPLAN-DR Summary

### Principles

1. Notebook files are user-owned assets.
2. Notebook writes are intent-authorized, not path-authorized.
3. Markdown is the canonical authoring format for v1.
4. Local filesystem truth comes before internal database convenience.
5. OpenViking is the target retrieval substrate, not the first implementation dependency.

### Decision Drivers

1. Trust boundary between user assets and agent assets.
2. Local-first desktop ergonomics for writing and managing notes.
3. Future compatibility with agent-side retrieval via OpenViking.

### Viable Options

#### Option A: OpenViking-first

Pros:
- conceptual purity
- fewer future migrations

Cons:
- current repo implementation is not there yet
- mixes substrate work with notebook-product decisions too early

#### Option B: Notebook UX first on current ad-hoc memory stack

Pros:
- fastest visible product
- lower immediate research cost

Cons:
- likely to create another temporary storage path
- high migration and drift risk

#### Option C: Governance-first notebook research, OpenViking-later

Pros:
- best fit for current repo reality
- keeps trust and filesystem ownership primary
- allows notebook product decisions before substrate replacement

Cons:
- requires discipline to avoid re-expanding into the whole memory program

### Chosen Direction

Choose **Option C**.

## ADR

### Decision

Research the notebook knowledge-base system in six ordered phases:

1. current-state audit and non-goals fence
2. governance and mutation contract
3. external benchmark of document-knowledge-base systems
4. writing workflows and trust UX
5. notebook file model and OpenViking ingest contract
6. sequencing and validation gate

### Alternatives Considered

- OpenViking-first was rejected because the current repo still runs on transitional storage contracts.
- UX-first on top of the current stack was rejected because it would likely create another temporary architecture.

### Why Chosen

This route respects the most important product fact: notebooks are user-owned files under `~/.nion-data/notebook`, while agent memory and journals are separate assets.

It also matches the intended interaction model: the user should be able to say "find that note and update it" without naming an exact path, while the system still preserves safety through history and rollback instead of path-level friction.

### Consequences

- research starts with trust and storage boundaries, not features
- benchmark work becomes targeted, not inspirational wandering
- OpenViking remains in scope, but only as a later ingest and retrieval substrate

### Follow-ups

- if Phase 1 or 2 reveals a broken assumption about local filesystem ownership, stop and rewrite the plan before product work begins

## Non-Goals

This research lane does **not** define:

- user-facing notebook search UI
- agent diary/journal UX
- user memory UX
- workflow/skill crystallization UX
- automatic agent-authored notebook mutation
- full OpenViking engine embedding work

## Phase 1: Current-State Audit And Scope Fence

### Questions

- What storage surfaces already exist today in Nion, and which of them overlap with future notebook concerns?
- Which current docs or contracts would mislead implementation if left uncorrected?
- What is explicitly out of scope for this notebook lane?

### Deliverables

- map of current storage surfaces: `memory.json`, `recall.sqlite3`, thread/workspace areas, uploads, outputs
- scope fence for this lane
- non-goals list that prevents drift back into broader memory/search work

### Exit Criteria

- there is a written list of in-scope and out-of-scope surfaces
- notebook lane is clearly separated from memory/journal/skill lanes
- migration assumptions are explicit enough to constrain later phases

## Phase 2: Governance And Mutation Contract

### Questions

- What actions count as notebook mutation?
- What counts as sufficient user intent authorization?
- Which notebook operations should apply immediately, and which still require confirmation?
- Which notebook operations require audit log, history, rollback, or confirmation?
- How should external-editor concurrency be handled?

### Deliverables

- actor/action matrix for `user`, `agent`, `background watcher`, and `OpenViking ingest`
- mutation taxonomy:
  - create
  - append
  - overwrite
  - rename
  - move
  - delete
  - frontmatter edit
  - tag edit
  - link insertion
  - attachment relocation
- authorization model:
  - semantic / intent-level authorization
  - agent-side target resolution inside `~/.nion-data/notebook`
  - ambiguity detection and follow-up questioning when the target is not unique
- history model:
  - article-level edit history
  - time-based rollback
  - attribution of agent-authored edits
  - deletion tombstone / pending-delete flow
- confirmation model:
  - default writes apply directly once intent is clear
  - delete requires explicit confirmation
  - destructive bulk actions require explicit confirmation

### Recommended Contract Direction

- The user does **not** need to provide an exact path.
- The user does **not** need to say "I authorize you to modify this file."
- If the user expresses a clear notebook-editing intent, the agent may locate the target note and apply the change directly.
- If the target is ambiguous, the agent must ask a follow-up question.
- Every non-delete notebook write must create recoverable history.
- Delete must always require an explicit confirm step, ideally with a small confirmation card that shows note title and summary.

### Exit Criteria

- every write-like action has an authorization rule grounded in user intent, not path specificity
- the contract explicitly distinguishes direct-apply writes, follow-up-required writes, and confirm-required deletes
- rollback and history requirements are specific enough to replace preview-first safety for normal edits
- notebook safety rules are concrete enough to drive UX and implementation

## Phase 3: External Benchmarking

### Benchmark Targets

- AFFiNE
- AppFlowy
- Logseq
- SiYuan

### Questions

- Which writing and storage patterns are worth borrowing for a local filesystem-backed notebook?
- Which patterns conflict with Nion's ownership model?
- Which systems handle Markdown fidelity, backlinks, attachments, and local editing most cleanly?

### Deliverables

- benchmark matrix across:
  - storage model
  - filesystem visibility
  - Markdown fidelity
  - attachment handling
  - backlinks/linking
  - daily notes/capture
  - local-first behavior
  - desktop writing ergonomics
- adopt/adapt/reject table

### Exit Criteria

- every benchmark finding maps back to a Nion notebook decision
- no benchmark feature is accepted just because it looks polished
- benchmark output is narrow enough to inform authoring and storage only

## Phase 4: Writing Workflows And Trust UX

### Questions

- What are the top canonical writing jobs for v1?
- What does “comfortable writing” mean in a desktop-first knowledge base?
- How should users discover and trust notebook history and rollback after agent edits?

### Deliverables

- 8 to 12 canonical notebook workflows, for example:
  - create a note
  - write in plain Markdown
  - add links to related notes
  - attach a file
  - rename a note
  - move a note to another folder
  - turn chat output into a note draft
  - ask the agent to revise a note with review before apply
- trust UX rules for:
  - direct apply for normal edits
  - history visibility
  - rollback entry points
  - attribution of agent edits
  - delete confirmation

### Exit Criteria

- each workflow has success criteria and mutation rules
- the UX model makes it impossible to irreversibly rewrite notebook content
- the workflow set is small enough to guide a first implementation slice

## Phase 5: Notebook File Model And OpenViking Ingest Contract

### Questions

- What should the canonical folder and file layout under `~/.nion-data/notebook` be?
- Do notes require frontmatter, stable IDs, or pure filename identity?
- How do links, tags, attachments, and note moves behave?
- How should OpenViking ingest notebook content without writing back?

### Deliverables

- canonical directory tree
- filename and path rules:
  - Unicode normalization
  - case sensitivity expectations
  - reserved-name constraints
  - move/rename semantics
- attachment policy
- link/reference policy
- notebook-to-OpenViking ingest contract:
  - source roots
  - watch vs snapshot mode
  - URI mapping
  - metadata extraction
  - freshness behavior
  - deletion semantics
  - provenance requirements
  - explicit one-way boundary: ingest reads notebook, does not mutate notebook

### Exit Criteria

- a developer could implement file watching and parsing without inventing semantics
- OpenViking ingest is bounded enough to build later without redefining notebook ownership
- all notebook content remains portable as user-visible files

## Phase 6: Sequencing And Validation Gate

### Questions

- What is the smallest credible v1 slice?
- Which risks must be validated before implementation starts?
- What must be deferred to v1.5/v2?

### Deliverables

- v1 / v1.5 / v2 sequence
- validation checklist:
  - notebook safety
  - external editor compatibility
  - markdown fidelity
  - attachment/link stability
  - user trust in agent-assisted writing
- risk register for:
  - concurrency
  - crash recovery
  - partial writes
  - cloud-sync edge cases
  - large attachments

### Exit Criteria

- v1 is small, desktop-native, and notebook-safe
- deferred items are explicit
- implementation can begin without unresolved ownership or storage ambiguity

## Recommended Immediate Next Step

Start with **Phase 1 + Phase 2 only**.

Do not benchmark products in detail until the mutation contract and scope fence are written down.
