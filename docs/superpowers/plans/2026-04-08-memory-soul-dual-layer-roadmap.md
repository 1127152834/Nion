# Memory Soul Dual-Layer Delivery Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each milestone plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the full Nion dual-layer memory and soul architecture in staged, production-safe milestones without resorting to MVP shortcuts or partial substitute designs.

**Architecture:** The delivery is intentionally split into independent but strictly ordered milestones. Each milestone must ship as a complete layer with real tests, real adapters, and real operator surfaces before the next layer is allowed to take over. The final system is only considered complete when all milestone plans are delivered and the legacy write/read paths are retired behind compatibility facades.

**Tech Stack:** Python 3.12, FastAPI, LangChain/LangGraph, SQLite, local filesystem artifacts, local embedded vector index, React 19, TypeScript, TanStack Query, node:test contract tests, `uv run pytest`

---

## Delivery Rule

This roadmap is not an MVP roadmap.

Every milestone below must:

- ship in a coherent state
- preserve existing product contracts during migration
- include real tests and verification evidence
- leave the codebase in a releasable condition
- be completed before the next milestone can become primary

Do **not** compress multiple milestones into one coding burst.

## Milestone Structure

### Milestone A: Contract Foundation And Evidence Backbone

**Plan:** `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-m1-contract-evidence-plan.md`

**Objective:**

- establish the new canonical storage contracts
- introduce Evidence Vault durable vs ephemeral capture
- preserve existing `session_mode / memory_read / memory_write` behavior
- expose initial ledger/evidence/runtime trace read surfaces without cutting primary read/write paths

**Exit Criteria:**

- new canonical tables and evidence storage exist
- current `/api/memory` and `/api/memory/growth*` contracts still work
- temporary/read-only sessions do not durable-write evidence or memory
- runtime trace and evidence explorer have stable backend surfaces

### Milestone B: Judge, Canonical Governance, And User-Control Surfaces

**Plan:** `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-m2-judge-governance-plan.md`

**Objective:**

- deliver proposal extraction, canonical judge pipeline, revisions, decisions, user overrides
- migrate growth/user-model/learning governance onto canonical objects
- ship Memory Ledger and Evidence Explorer as real governance UI

**Exit Criteria:**

- shadow judge is replaced with primary canonical write path
- user rewrite/freeze/delete flows operate on canonical nodes and revisions
- `learning` remains first-class through canonical governance
- current growth and soul mutation routes still function through adapters

### Milestone C: Runtime Memory Engine, Search Fusion, And Local Vector Layer

**Plan:** `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-m3-runtime-recall-vector-plan.md`

**Objective:**

- replace summary-dump prompt injection with layered runtime assembly
- deliver `memory_read`-aware read gating
- add taxonomy + FTS + vector + fusion retrieval
- ship local managed embedding experience plus remote/custom providers

**Exit Criteria:**

- Runtime Memory Engine becomes primary read path
- vector layer is embedded and rebuildable, but not a truth source
- local default embedding setup is usable for non-technical users
- runtime trace explains why memories/evidence were used

### Milestone D: Soul Engine, Projection Chain, And Legacy Retirement

**Plan:** `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-m4-soul-projection-retirement-plan.md`

**Objective:**

- deliver four-layer soul governance and Soul Console
- wire `learning -> procedure / automation / soul reflection` projections
- retire legacy extractor/queue/summary mainline responsibilities
- keep compatibility facades while removing legacy internal truth paths

**Exit Criteria:**

- soul revisions are canonical and traceable
- relationship stance and adaptive overlay are governed, not patched summaries
- procedure and automation projection are provenance-linked to canonical memory
- legacy write/read internals are retired without breaking external routes

## Required Execution Order

1. Milestone A
2. Milestone B
3. Milestone C
4. Milestone D

No milestone may start implementation until the previous milestone:

- passes its own tests
- satisfies its exit criteria
- has its compatibility adapters working
- is committed in a reviewable state

## Global Guardrails

- Do not reintroduce a third memory root outside `Paths`.
- Do not let any stage bypass `memory_read` or `memory_write`.
- Do not let vector search become a truth source.
- Do not remove existing `/api/memory` or `/api/memory/growth*` product contracts before the final retirement milestone.
- Do not merge `learning` into `procedure`.
- Do not switch soul governance before canonical memory and runtime recall are stable.

## Verification Matrix

Before declaring the program complete, all four milestone plans must jointly prove:

- canonical traceability for v2-native memory
- explicit `legacy_unverified` marking for imported records
- durable/ephermeral session policy enforcement
- user override priority over automatic updates
- layered runtime recall behind `memory_read` gates
- local managed embedding flow
- soul revision governance and rollback
- projection provenance for procedure and automation
- legacy retirement with compatibility facades preserved
