# OpenSpace Working Folder

This directory is the canonical place for OpenSpace-related material in `nion`.

Use it for:

- OpenSpace capability research
- product-line planning derived from OpenSpace
- upgrade impact analysis
- future development notes for OpenSpace-inspired features
- ongoing progress tracking for implementation work

Current documents:

- `openspace-capability-research.md`
- `openspace-nion-adaptation.md`
- `2026-03-28-openspace-capability-adoption-product-line.md`
- `2026-03-28-openspace-upgrade-impact-matrix.md`
- `PROGRESS.md`
- `DECISIONS.md`
- `EXPERIMENTS.md`

Rule:

- New OpenSpace learning notes, design docs, and progress updates should be added under `docs/openspace/`.

## How To Use This Folder

Use this directory as a small operating system for OpenSpace-inspired work.

### 1. Research Layer

Use these files to avoid re-reading the same external material:

- `openspace-capability-research.md`: raw researched conclusions with evidence
- `openspace-nion-adaptation.md`: what applies to `nion`

Rule:

- Do not re-open a broad research topic until these files are checked first.

### 2. Planning Layer

Use these files to decide what to build next:

- `2026-03-28-openspace-capability-adoption-product-line.md`
- `2026-03-28-openspace-upgrade-impact-matrix.md`

Rule:

- Before starting a new implementation lane, map it to an item in the impact matrix.

### 3. Execution Layer

Use these files during active development:

- `PROGRESS.md`: current status, next milestone, blockers
- `DECISIONS.md`: concise decision log so we do not re-debate the same architecture choices
- `EXPERIMENTS.md`: benchmark runs, prototype results, and implementation evidence

Rule:

- Every meaningful step should update at least one of these three files.

## Operating Workflow

For every OpenSpace-inspired upgrade:

1. Read the impact matrix and select one upgrade item.
2. Record the chosen lane in `PROGRESS.md`.
3. If a new tradeoff is made, write it to `DECISIONS.md`.
4. If code or benchmark evidence is produced, write it to `EXPERIMENTS.md`.
5. If the work changes strategy or scope, update the product-line doc or impact matrix.

## Anti-Repetition Rules

- Do not start a fresh research note for a question that is already answered in `openspace-capability-research.md`.
- Do not reopen an architecture debate without adding a new entry to `DECISIONS.md`.
- Do not claim a capability works without a matching entry in `EXPERIMENTS.md`.
- Do not move to the next wave until `PROGRESS.md` marks the current wave as complete or explicitly blocked.
