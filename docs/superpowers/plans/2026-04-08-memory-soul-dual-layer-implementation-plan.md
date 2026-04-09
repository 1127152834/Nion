# Memory Soul Dual-Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Nion dual-layer memory and soul system exactly as designed, by executing four full milestones in order rather than collapsing the work into one oversized, high-risk implementation burst.

**Architecture:** This is a parent execution index, not a single coding batch. The architecture is intentionally split into four full milestones because the spec spans independent subsystems: storage/contracts, governance/judge, runtime recall/vector search, and soul/projection/retirement. Each milestone is complete in itself, but the final architecture is only done when all four are finished in order.

**Tech Stack:** Python 3.12, FastAPI, SQLite, local filesystem, LangChain/LangGraph, React 19, TypeScript, TanStack Query, embedded vector index, `uv run pytest`, `pnpm --dir frontend test:contracts`

---

## Why This Plan Is Split

This design is too large and too safety-critical to express as one monolithic implementation plan without turning into an unreadable giant checklist.

The correct execution model is:

- one roadmap file for sequencing and exit criteria
- one implementation plan per milestone
- each milestone ships fully before the next becomes primary

This is **not** an MVP strategy.

It is a full-delivery strategy with controlled cutovers.

## Milestone Plans

### Milestone A: Contract And Evidence Backbone

Plan file:

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-m1-contract-evidence-plan.md`

Delivers:

- canonical v2 storage foundation
- Evidence Vault
- session-gated durable capture
- read-only ledger/evidence/runtime-trace surfaces

### Milestone B: Judge And Governance

Plan file:

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-m2-judge-governance-plan.md`

Delivers:

- proposal extraction
- Memory Judge
- revisions / decisions / user overrides
- growth/soul compatibility adapters
- Memory Ledger and Evidence Explorer governance UI

### Milestone C: Runtime Recall And Vector Layer

Plan file:

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-m3-runtime-recall-vector-plan.md`

Delivers:

- Runtime Memory Engine
- `memory_read`-gated layered recall
- taxonomy + FTS + vector + fusion retrieval
- local managed embedding UX
- runtime trace page and memory settings panel

### Milestone D: Soul, Projections, And Legacy Retirement

Plan file:

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-m4-soul-projection-retirement-plan.md`

Delivers:

- four-layer soul governance
- Soul Judge
- `learning -> procedure / automation / soul reflection` projections
- Soul Console
- legacy memory mainline retirement

## Required Execution Order

- [x] Execute Milestone A plan completely
- [x] Verify Milestone A exit criteria
- [x] Execute Milestone B plan completely
- [x] Verify Milestone B exit criteria
- [x] Execute Milestone C plan completely
- [x] Verify Milestone C exit criteria
- [x] Execute Milestone D plan completely
- [x] Verify Milestone D exit criteria

No milestone may skip ahead of the previous one.

## Completion Rule

The implementation is not complete when the first milestone works.

The implementation is only complete when:

- all four milestone plans are implemented
- all milestone verification suites pass
- compatibility routes still work
- the roadmap file marks all milestones complete

Status 2026-04-09:

- all four milestone plans are implemented in the current worktree lineage
- milestone verification suites passed before the latest checkpoint commits were recorded
- compatibility routes remain in place during the cutover window
- roadmap/spec checkpoints have been updated to reflect M1-M4 completion
