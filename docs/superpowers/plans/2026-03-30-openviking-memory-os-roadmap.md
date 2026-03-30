# OpenViking Memory OS Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each milestone plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Nion's pluggable Memory OS in controlled milestones so architecture risk, migration risk, and UX churn stay bounded.

**Architecture:** Replace direct runtime dependence on `memory.json` with a provider-driven Memory OS. Roll the change out in sequenced milestones: first add the provider foundation, then migrate runtime reads/writes, then rebuild product surfaces, and finally add heartbeat, identity, soul, and self-evolution loops on top of the new memory substrate.

**Tech Stack:** FastAPI, Pydantic, SQLite, embedded OpenViking stores, optional external provider adapters, React 19, Next.js App Router, TypeScript, TanStack Query, existing Nion settings/config-center stack, pytest, node:test

---

## Milestone Strategy

The Memory OS rollout should be executed as six milestones. Each milestone should leave the product in a coherent, testable state and should be able to ship independently if needed.

## Milestone 0: Provider Foundation

**Objective**

Introduce the provider abstraction, provider registry, provider metadata model, and provider binding model without changing the current user-facing product behavior.

**Why first**

Everything else depends on this. Until the runtime has a provider contract, every later step would be another hard-coded patch.

**Primary outcomes**

- `MemoryProvider` protocol exists
- provider registry and provider service exist
- Built-in, Mem0, and OpenViking provider families are representable in config and API
- active provider binding can be read and updated
- current memory and OpenViking systems are still untouched at runtime

**Risk profile**

Low-to-medium. Mostly additive backend work.

**Exit criteria**

- provider registry and metadata API are live
- settings UI can show provider choices and deployment modes
- no runtime path depends on the new provider contract yet

## Milestone 1: Runtime Migration Off `memory.json`

**Objective**

Move runtime memory access behind the provider contract and remove direct runtime reads/writes to `memory.json`.

**Primary outcomes**

- pre-chat context assembly and post-run extraction talk to the active provider
- `memory.json` becomes legacy import/export only
- Built-in provider becomes the initial runtime-compatible replacement
- OpenViking provider stub path is runnable behind the same contract

**Risk profile**

High. This is the first milestone that changes the hot path.

**Exit criteria**

- no production runtime path directly calls legacy `memory` updater/storage functions
- existing continuity and memory tests are reworked to pass through the provider
- a legacy import path still exists

## Milestone 2: OpenViking Provider Activation

**Objective**

Turn OpenViking into a full provider family with both `embedded` and `remote` modes and make `embedded-openviking` the recommended default.

**Primary outcomes**

- provider family `openviking` supports both deployment modes
- notebook, user_memory, agent_memory, and autodream_journal domains flow through OpenViking
- remote mode health/status is inspectable
- canonical local assets sync into provider-visible records

**Risk profile**

High. This is where domain mapping and deployment mode complexity land.

**Exit criteria**

- embedded mode works end-to-end locally
- remote mode can be configured and health-checked
- OpenViking provider capability surface is visible in UI and API

## Milestone 3: Memory Console Product Surface

**Objective**

Replace the current mixed memory settings page with a product-grade Memory OS surface.

**Primary outcomes**

- split the current memory settings page into:
  - Memory Provider
  - Memory Console
  - Agent Core
- remove the mixed card stack that currently combines config, retrieval, and operator debugging
- expose provider capabilities, compact/rebuild, memory search, and domain views coherently

**Risk profile**

Medium. Mostly frontend and API shaping work, but high UX visibility.

**Exit criteria**

- memory surface no longer presents `memory.json` as the primary mental model
- AutoDream and OpenViking no longer appear as ad hoc debug cards in the main memory flow
- provider selection and status are understandable to a normal user

## Milestone 4: Canonical Asset Domains

**Objective**

Formalize local canonical ownership for notebook, identity, soul, and Dream Log artifacts while keeping them fully available through the provider contract.

**Primary outcomes**

- notebook canonical source remains `~/.nion-data/notebook`
- Dream Log canonical source remains local
- identity and soul canonical artifacts are introduced
- provider support mode for each domain is explicit: native, adapted, or mirrored

**Risk profile**

Medium. Domain ownership and synchronization complexity matter more than raw implementation size.

**Exit criteria**

- canonical-vs-provider boundaries are enforced in code
- migration and rebuild flows preserve local authority over notebook, identity, soul, and Dream Log

## Milestone 5: Heartbeat And Self-Evolution

**Objective**

Layer heartbeat, reflective maintenance, and controlled self-evolution on top of the Memory OS.

**Primary outcomes**

- heartbeat becomes a first-class autonomous session type
- AutoDream integrates with heartbeat and compact/rebuild
- soul and identity update proposals become part of the reflective loop
- future skill/action proposal flow has a stable home

**Risk profile**

High conceptually, medium technically if the earlier milestones are solid.

**Exit criteria**

- heartbeat runs, logs, and maintenance loops are visible and controllable
- self-evolution is expressed as bounded proposals rather than uncontrolled mutation

## Recommended Milestone Order

1. Milestone 0: Provider Foundation
2. Milestone 1: Runtime Migration Off `memory.json`
3. Milestone 2: OpenViking Provider Activation
4. Milestone 3: Memory Console Product Surface
5. Milestone 4: Canonical Asset Domains
6. Milestone 5: Heartbeat And Self-Evolution

## Delivery Rule

Do not attempt to execute multiple milestones inline in a single implementation burst.

Each milestone should have:

- its own spec-aware implementation plan
- its own test scope
- its own verification checkpoint
- its own commit series

This is required to keep quality high and to avoid a multi-week patch stack that is hard to review or recover from.

## Tracking File

Use this companion checklist as the single execution tracker for milestone progress, exit gates, and review status:

- [2026-03-30-openviking-memory-os-milestone-checklist.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-30-openviking-memory-os-milestone-checklist.md)
