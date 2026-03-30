# Memoh-Style Memory And Self-Maintenance Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each milestone plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Nion's memory roadmap around a Memoh-style backbone of provider-driven memory, heartbeat, compaction, rebuild, status, and always-on continuity, while preserving Nion's separate `Knowledge Base / Memory / Self-Maintenance / Projects` product model.

**Architecture:** Nion should replicate Memoh's memory engine and autonomy skeleton, but not its multi-bot and multi-user product shell. The implementation must retire `AutoDream` as a standalone product concept and absorb its useful ideas into a bounded reflective self-maintenance and self-upgrade layer triggered by heartbeat and supported by compaction/rebuild.

**Tech Stack:** FastAPI, Pydantic, SQLite, embedded OpenViking runtime, provider-driven Memory OS, Electron desktop runtime, Next.js/React frontend, pytest, node:test, local filesystem notebook, future project module

---

## Non-Negotiable Reference Rule

Every implementation milestone in this roadmap must follow this rule:

- **Do not implement from README-level understanding alone**
- **Read relevant Memoh source code before finalizing architecture or APIs**
- **Use Memoh's README, OpenAPI, SDK types, and internal source together**
- **When Memoh behavior and README differ, source code wins**

Minimum required reference surfaces:

1. `../Memoh/README.md`
2. `../Memoh/README_CN.md`
3. `../Memoh/spec/swagger.yaml`
4. `../Memoh/packages/sdk/src/types.gen.ts`
5. Relevant backend source under:
   - `../Memoh/cmd/agent/main.go`
   - `../Memoh/internal/memory/`
   - `../Memoh/internal/heartbeat/`
   - related handlers / services / adapters as needed

## Product Boundary Rules

- `Notebook` belongs to `Knowledge Base`, not `Memory`
- `OpenViking` is a capability layer, not a top-level user product category
- `Memory` contains structured long-term memory only
- `Self-Maintenance` contains heartbeat, compaction, rebuild, reflective logs, and self-upgrade proposals
- `Projects` is a future dedicated domain and is separate from notebook
- `AutoDream` is no longer a standalone top-level concept

## Milestone Strategy

This roadmap should be executed as six milestones.

Each milestone must:

- ship in a coherent state
- have its own implementation plan
- have its own test scope
- have its own verification evidence
- have its own checkpoint commit series

## Milestone M0: Strategic Baseline And Source Alignment

**Objective**

Create a source-grounded parity baseline against Memoh so future implementation work is not based on guesswork or README-only assumptions.

**Primary outcomes**

- Memoh capability matrix exists
- Nion vs Memoh gap matrix exists
- each major memory/self-maintenance surface is mapped to source references
- explicit list of what Nion will replicate and what it will intentionally not replicate

**Exit criteria**

- source-backed parity matrix is written
- all future milestones link to that parity matrix
- roadmap scope is frozen around personal-assistant needs

## Milestone M1: Heartbeat Backbone

**Objective**

Implement Memoh-style heartbeat as a first-class always-on continuity mechanism in Nion.

**Primary outcomes**

- heartbeat service exists
- heartbeat trigger loop exists
- heartbeat logs exist
- heartbeat status exists
- desktop daemon can expose heartbeat runtime state

**Exit criteria**

- heartbeat can run without AutoDream
- heartbeat logs are queryable
- heartbeat is visible in status surfaces

## Milestone M2: Memory Compaction

**Objective**

Implement provider-driven compaction for structured long-term memory.

**Primary outcomes**

- compaction API exists
- compaction logs exist
- stale / duplicate memory handling exists
- compaction can run manually and via heartbeat trigger

**Exit criteria**

- memory compaction is no longer a planned concept only
- compaction results are inspectable

**Current evidence**

- compaction service/store/router implemented in Nion
- `/api/memory/compact`, `/api/memory/compact/logs`, `/api/memory/status`, `/api/memory/usage` are reachable from desktop runtime
- heartbeat backbone can trigger compaction through maintenance runner integration

## Milestone M3: Memory Rebuild

**Objective**

Implement provider-aware rebuild so memory can be restored / regenerated from canonical sources and provider-visible structures.

**Primary outcomes**

- rebuild API exists
- rebuild logs exist
- provider rebuild status exists
- OpenViking-backed rebuild path is defined

**Exit criteria**

- rebuild can restore runtime memory structures
- rebuild is visible as an operator/admin action

## Milestone M4: Reflective Self-Maintenance Layer

**Objective**

Retire `AutoDream` as a standalone product concept and integrate its useful ideas into the heartbeat-driven maintenance loop.

**Primary outcomes**

- reflective maintenance pass exists
- reflective logs exist
- maintenance proposals exist
- memory-update proposals and self-upgrade proposals are bounded and inspectable

**Exit criteria**

- no top-level product concept still depends on the old `AutoDream` framing
- reflective maintenance runs on top of heartbeat / compaction / rebuild

## Milestone M5: Memory Product Surface

**Objective**

Rebuild the product IA so `Knowledge Base`, `Memory`, and `Self-Maintenance` become separate user-facing domains.

**Primary outcomes**

- notebook fully leaves the memory page
- memory page focuses on memory only
- self-maintenance page focuses on heartbeat / maintenance / proposals
- OpenViking is treated as a capability layer

**Exit criteria**

- notebook is not presented as part of memory
- self-maintenance is not confused with notebook
- user-facing mental model is coherent

## Milestone M6: Provider Parity Completion

**Objective**

Fill remaining provider/runtime gaps so Nion approaches Memoh-level backbone completeness for personal AI assistant use.

**Primary outcomes**

- Mem0 provider moves beyond metadata shell
- provider status / usage surfaces are complete
- memory admin/runtime surfaces approach parity with Memoh where relevant

**Exit criteria**

- major provider parity gaps are closed
- backbone completeness is no longer blocked by shell implementations

## Recommended Execution Order

1. M0 Strategic Baseline And Source Alignment
2. M1 Heartbeat Backbone
3. M2 Memory Compaction
4. M3 Memory Rebuild
5. M4 Reflective Self-Maintenance Layer
6. M5 Memory Product Surface
7. M6 Provider Parity Completion

## Delivery Rule

Do not execute multiple milestones inline in a single coding burst.

Each milestone must have:

- its own spec-aware implementation plan
- its own verification checklist
- its own review checkpoint
- its own commit series

## Companion Sources

- [2026-03-31-memoh-style-memory-self-maintenance-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-style-memory-self-maintenance-design.md)
- [2026-03-31-memoh-reference-reading-log.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-reference-reading-log.md)
- [2026-03-31-memoh-nion-parity-baseline.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md)
