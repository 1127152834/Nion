# OpenViking Memory OS Milestone Checklist

> **Purpose:** This file is the single execution checklist for the OpenViking Memory OS program. Update it whenever a milestone starts, changes scope, passes verification, or is blocked.

## Program Status

- Overall status: `in_progress`
- Current focus milestone: `M0`
- Design source:
  - [2026-03-30-openviking-memory-os-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-30-openviking-memory-os-design.md)
- Roadmap source:
  - [2026-03-30-openviking-memory-os-roadmap.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-30-openviking-memory-os-roadmap.md)

## Milestone Summary

| Milestone | Name | Status | Plan | Exit Gate | Notes |
|---|---|---|---|---|---|
| M0 | Provider Foundation | `in_progress` | [M0 Plan](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-30-openviking-memory-os-m0-provider-foundation-implementation-plan.md) | Provider registry, metadata API, and active binding are live | Backend and frontend foundation slices are implemented in worktree |
| M1 | Runtime Migration Off `memory.json` | `not_started` | Not written yet | No runtime hot path reads/writes legacy memory directly | Must follow M0 |
| M2 | OpenViking Provider Activation | `not_started` | Not written yet | `embedded` and `remote` OpenViking modes work through provider contract | Depends on M1 |
| M3 | Memory Console Product Surface | `not_started` | Not written yet | Memory UI is split into Provider / Console / Agent Core | Depends on M2 contract stability |
| M4 | Canonical Asset Domains | `not_started` | Not written yet | Notebook, Dream Log, identity, and soul local ownership enforced | Depends on M2 and M3 |
| M5 | Heartbeat And Self-Evolution | `not_started` | Not written yet | Heartbeat, AutoDream, compact, and identity/soul proposals form a bounded loop | Final milestone |

## Milestone Gates

### M0: Provider Foundation

- [x] `MemoryProvider`-level contract exists in backend code
- [x] Provider families `builtin`, `mem0`, `openviking` are modeled
- [x] OpenViking supports metadata for `embedded` and `remote` modes
- [x] Provider registry exists
- [x] Active provider binding exists
- [x] Shared runtime exposes Memory OS provider API
- [x] Frontend can read provider families and active binding
- [ ] Current runtime hot path still behaves exactly as before
- [x] Backend targeted tests pass
- [x] Frontend targeted tests pass
- [x] Docs updated
- [ ] Milestone review completed

### M1: Runtime Migration Off `memory.json`

- [ ] Runtime reads memory only through provider hooks
- [ ] Runtime writes memory only through provider hooks
- [ ] Legacy `/api/memory` is clearly marked compatibility-only or translated through provider
- [ ] `memory.json` leaves runtime hot path
- [ ] Legacy import path exists
- [ ] Continuity and memory regression tests pass
- [ ] Docs updated
- [ ] Milestone review completed

### M2: OpenViking Provider Activation

- [ ] OpenViking provider supports `embedded` mode end-to-end
- [ ] OpenViking provider supports `remote` mode configuration and status
- [ ] `notebook` domain flows through OpenViking provider
- [ ] `user_memory` domain flows through OpenViking provider
- [ ] `agent_memory` domain flows through OpenViking provider
- [ ] `autodream_journal` domain flows through OpenViking provider
- [ ] Capability surface distinguishes native/adapted/mirrored support
- [ ] Provider health/status is visible in API
- [ ] Regression tests pass
- [ ] Docs updated
- [ ] Milestone review completed

### M3: Memory Console Product Surface

- [ ] Memory page is no longer a mixed card stack
- [ ] `Memory Provider` surface exists
- [ ] `Memory Console` surface exists
- [ ] `Agent Core` surface exists
- [ ] AutoDream no longer looks like an ad hoc debug card in the main flow
- [ ] OpenViking controls no longer look like an ad hoc debug card in the main flow
- [ ] Provider status and capability language is understandable to normal users
- [ ] Frontend tests pass
- [ ] Docs updated
- [ ] Milestone review completed

### M4: Canonical Asset Domains

- [ ] Notebook canonical source remains local filesystem
- [ ] Dream Log canonical source remains local
- [ ] Identity canonical artifact exists
- [ ] Soul canonical artifact exists
- [ ] Provider sync model for notebook is explicit
- [ ] Provider sync model for Dream Log is explicit
- [ ] Provider sync model for identity is explicit
- [ ] Provider sync model for soul is explicit
- [ ] Rebuild preserves canonical ownership
- [ ] Docs updated
- [ ] Milestone review completed

### M5: Heartbeat And Self-Evolution

- [ ] Heartbeat becomes a first-class autonomous session mechanism
- [ ] Heartbeat logs are queryable
- [ ] AutoDream cooperates with heartbeat
- [ ] Compact and rebuild cooperate with AutoDream
- [ ] Identity proposal flow exists
- [ ] Soul proposal flow exists
- [ ] Self-evolution is bounded and reviewable, not silent mutation
- [ ] Docs updated
- [ ] Milestone review completed

## Change Control Rules

- [ ] Do not execute more than one milestone implementation plan at the same time
- [ ] Do not start a milestone before its previous milestone exit gate is checked
- [ ] Do not merge milestone scope creep into the current milestone without updating this checklist
- [ ] Do not mark a milestone complete without test evidence and doc updates

## Running Notes

### 2026-03-30

- Program initialized.
- Memory OS design committed in `0b005cce`.
- Roadmap and M0 implementation plan committed in `58239a01`.
- Tracker added so future implementation stays milestone-scoped.
- M0 execution started in worktree `codex/memory-os-m0-provider-foundation`.
- Implemented backend foundation slice:
  - provider family metadata
  - provider state storage
  - registry stubs
  - `/api/memory-os/providers/families`
  - `/api/memory-os/providers/state`
  - `PUT /api/memory-os/providers/state`
- Implemented frontend foundation slice:
  - `core/memory-os` client and hooks
  - temporary provider foundation card mounted above the legacy memory settings cards
- Current verification evidence:
  - backend: `15 passed`
  - frontend: `5 passed`
  - backend lint: passed
- Fixed test isolation for provider-state persistence so router tests no longer leak state across runs.
