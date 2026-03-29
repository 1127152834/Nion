---
name: openspace-capability-rebuild
description: Use when planning, implementing, reviewing, or tracking any nion work inspired by OpenSpace, including execution reuse, artifact capture, artifact evolution, lineage, token benchmarking, or shared learnings. Use whenever a task must stay aligned with docs/openspace, move one lane at a time, and leave durable evidence so the team does not repeat research or lose progress.
---

# OpenSpace Capability Rebuild

## Overview

This skill is the operating workflow for rebuilding selected OpenSpace capabilities inside `nion` without drifting, overbuilding, or repeating old research.

Core principle:

**Use `docs/openspace/` as the source of truth, advance one lane at a time, and leave evidence every time.**

This skill is not for generic skill work. It is for OpenSpace-inspired capability development in `nion`.

## When to Use

Use this skill whenever the task is about any of the following:

- OpenSpace-inspired capability planning
- token tracker upgrades
- cold/warm benchmark work
- reusable artifact capture
- reusable artifact retrieval
- artifact quality counters
- artifact evolution
- lineage, diff, rollback
- artifact diagnostics
- workspace sharing of reusable artifacts
- deciding what to copy, adapt, or reject from OpenSpace
- updating progress or decisions for this product line

Do not use this skill for:

- unrelated notebook work
- unrelated memory work
- generic UI polish
- generic bugfixes with no OpenSpace connection

## Source Of Truth

Always use these files first.

### Research

- `docs/openspace/openspace-capability-research.md`
- `docs/openspace/openspace-nion-adaptation.md`

Purpose:

- understand what OpenSpace actually does
- avoid re-researching answered questions

### Product Planning

- `docs/openspace/2026-03-28-openspace-capability-adoption-product-line.md`
- `docs/openspace/2026-03-28-openspace-upgrade-impact-matrix.md`

Purpose:

- decide what lane to work on
- understand impact scope, refactor cost, and sequencing

### Execution Control

- `docs/openspace/PROGRESS.md`
- `docs/openspace/DECISIONS.md`
- `docs/openspace/EXPERIMENTS.md`

Purpose:

- track current lane and wave
- record architecture/product decisions
- record benchmark and implementation evidence

## Required Reading Order

Before starting any OpenSpace-inspired task, read in this order:

1. `docs/openspace/README.md`
2. `docs/openspace/PROGRESS.md`
3. `docs/openspace/DECISIONS.md`
4. the relevant section of `docs/openspace/2026-03-28-openspace-upgrade-impact-matrix.md`
5. only then open research or product-line docs as needed

If the task is about what to build:

- read the product-line doc after the impact matrix

If the task is about whether an idea is valid:

- read the research and adaptation docs after the impact matrix

## Non-Negotiable Workflow

Follow this sequence strictly.

### Phase 0: Classify The Lane

Map the task to exactly one active lane.

Allowed lane types:

- `Wave 0 / Measurement Foundation`
- `Wave 1 / Execution Reuse`
- `Wave 2 / Inspectability And Governance`
- `Wave 3 / Workspace Sharing`
- `Wave 4 / Guarded Automation`

If the task spans multiple lanes, split it and pick the first prerequisite lane only.

Do not implement across waves in one pass.

### Phase 1: Check Existing Knowledge Before Thinking Fresh

Answer these questions before planning:

1. Is this already answered in `openspace-capability-research.md`?
2. Is there already a recommendation in `openspace-nion-adaptation.md`?
3. Is the upgrade item already defined in the impact matrix?
4. Is there already a decision in `DECISIONS.md` that constrains the work?
5. Is there already an experiment result in `EXPERIMENTS.md` that changes the plan?

If the answer is yes to any of these, reuse it.

Do not reopen old debates without new evidence.

### Phase 2: Define The Slice

Before coding or changing plans, define:

- lane
- target upgrade item
- implementation goal
- non-goals
- success signal
- verification command or evidence source
- impact scope

Keep the slice minimal.

Good slices:

- add source-tagged token tracking for lead-agent and subagent calls
- add artifact candidate extraction after delegated task completion
- add retrieval injection into the lead-agent prompt

Bad slices:

- build the whole artifact system
- add sharing, lineage, and auto-activation together
- "make nion more like OpenSpace"

### Phase 3: Update Control Docs Before Major Work

Before major implementation or benchmark work:

- update `PROGRESS.md` with current wave, milestone, and lane

If a new architectural or product choice is made:

- append an entry to `DECISIONS.md`

If the task is a benchmark, prototype, or measurable experiment:

- add a stub entry to `EXPERIMENTS.md` before running it

### Phase 4: Implement Or Prototype

Choose one of these modes:

- `research update`
- `design update`
- `implementation`
- `benchmark`
- `review`

#### Implementation mode

Rules:

- keep the diff scoped to the active lane
- prefer additive changes over broad rewrites
- do not widen from measurement to mutation in one pass
- do not mix artifact reuse with notebook or memory semantics

#### Benchmark mode

Rules:

- record baseline first
- record warm/cold comparison if relevant
- separate user-visible execution cost from artifact-system overhead

### Phase 5: Verify

Always verify according to the lane.

Examples:

- measurement lane: verify cost attribution or benchmark output exists
- retrieval lane: verify artifact retrieval path works and is inspectable
- evolution lane: verify diff, lineage, and rollback behavior
- sharing lane: verify trust boundary and scope behavior

Do not declare progress without evidence.

### Phase 6: Record Evidence

After verification:

- add or update an `EXPERIMENTS.md` entry with evidence and result

If the implementation changed direction or invalidated an old assumption:

- append a new `DECISIONS.md` entry

Finally:

- update `PROGRESS.md` with new status, blockers, or next lane

## Upgrade Strategy

Default order:

1. measure
2. reuse
3. inspect
4. evolve
5. share
6. automate

Never reverse this order without explicit new evidence.

### Wave 0: Measurement Foundation

Preferred work:

- source-tagged token tracker
- cold/warm benchmark harness

Why:

- proves whether the product line is worth deeper investment

### Wave 1: Execution Reuse

Preferred work:

- post-run artifact capture
- artifact store
- retrieval injection
- quality counters

Why:

- gives user-visible value with lower trust risk than mutation

### Wave 2: Inspectability And Governance

Preferred work:

- artifact diagnostics
- inspection UI
- reviewed evolution
- lineage, diff, rollback

Why:

- reusable artifacts become dangerous if they are invisible or irreversible

### Wave 3: Workspace Sharing

Preferred work:

- workspace-scoped sharing
- artifact health triggers

Why:

- only after local reuse is proven should patterns spread

### Wave 4: Guarded Automation

Preferred work:

- guarded auto-activation
- broader exchange

Why:

- largest blast radius
- requires mature trust and rollback systems

## Output Contract

Every OpenSpace-inspired work cycle should leave behind:

### Minimum Output

- one explicit lane selection
- one verification result
- one update to `PROGRESS.md`, `DECISIONS.md`, or `EXPERIMENTS.md`

### If You Changed Product Direction

Also update:

- `2026-03-28-openspace-capability-adoption-product-line.md`
or
- `2026-03-28-openspace-upgrade-impact-matrix.md`

### If You Added New Research

Also update:

- `openspace-capability-research.md`
or
- `openspace-nion-adaptation.md`

## Anti-Drift Rules

Do not do any of the following:

- start a new broad OpenSpace research pass without checking the existing research docs
- implement across multiple waves in one task
- add auto-activation before measurement and governance are proven
- mix reusable artifact storage into notebook or memory
- use "collective intelligence" to describe plain subagent parallelism
- claim token efficiency without separating subsystem overhead from task execution cost

## Quality Bar

A good OpenSpace-inspired upgrade in `nion` has all of these:

- aligned to one upgrade item in the impact matrix
- scoped to one current lane
- backed by evidence
- reflected in progress tracking
- consistent with existing decisions
- leaves the docs better than it found them

## Quick Start

If you are asked to work on an OpenSpace-inspired feature and do not know where to begin:

1. read `docs/openspace/README.md`
2. read `docs/openspace/PROGRESS.md`
3. choose the relevant upgrade item in `docs/openspace/2026-03-28-openspace-upgrade-impact-matrix.md`
4. define one minimal slice
5. update `PROGRESS.md`
6. implement or benchmark
7. record evidence in `EXPERIMENTS.md`

## One-Line Rule

**Never move OpenSpace-inspired work forward without also moving the evidence trail forward.**
