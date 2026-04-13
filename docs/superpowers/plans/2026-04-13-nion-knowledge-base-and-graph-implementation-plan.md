# Nion Knowledge Base And Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Nion 项目建立一个长期可维护的知识库与知识图谱，系统收录产品功能、模块边界、业务逻辑、UI 设计、配色语言、测试护栏、残余代码与整改线索，并建立后续随代码变化同步更新的机制。

**Architecture:** 采用“先协议、再主干、后专项、再同步机制”的知识编译路线。先统一 `/Users/zhangtiancheng/Documents/wiki` 的 schema、taxonomy、入口页与 ingest contract，再按模块分波次沉淀知识页和 owner map，最后通过 lint、graph 和仓库内同步文档把知识更新纳入开发流程。

**Tech Stack:** Markdown wiki (`/Users/zhangtiancheng/Documents/wiki`), llm-wiki-agent workflow, repository docs/specs/plans/reviews, source inspection via `rg`/`sed`, Python helper scripts (`tools/query.py`, `tools/build_graph.py`)

---

### Task 1: Freeze Wiki Workspace Contract

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/wiki/AGENTS.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionKnowledgeBaseContract.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`

- [ ] **Step 1: Read the current wiki workspace contract and index**

Run: `sed -n '1,260p' /Users/zhangtiancheng/Documents/wiki/AGENTS.md && printf '\n---\n' && sed -n '1,260p' /Users/zhangtiancheng/Documents/wiki/wiki/index.md && printf '\n---\n' && sed -n '1,200p' /Users/zhangtiancheng/Documents/wiki/wiki/log.md`
Expected: see the default llm-wiki-agent workflow plus an almost-empty index/log.

- [ ] **Step 2: Write a dedicated Nion knowledge-base contract page**

Create `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionKnowledgeBaseContract.md` with this content:

```md
---
title: "Nion Knowledge Base Contract"
type: concept
tags: [nion, wiki, contract]
sources: []
last_updated: 2026-04-13
---

## Purpose

This page defines how the Nion project is compiled into the wiki.

## Scope

- Product capabilities and user-visible workflows
- Backend / frontend / desktop / daemon architecture
- Business logic, truth ownership, route ownership, state ownership
- UI system, navigation, visual language, color semantics
- Test coverage maps, documentation drift, residue inventories
- Refactor backlog and remediation navigation

## Rules

- The wiki is not a source mirror.
- Every page must name owners, boundaries, and truth sources.
- Product descriptions must link to implementation owners.
- UI pages must link to route owners and state owners.
- Residue pages must distinguish active chain vs retired chain.
- Future feature changes must update affected wiki pages in the same delivery cycle.

## Knowledge Layers

- [[NionProjectOverview]]
- [[RepositoryStructure]]
- [[BackendArchitecture]]
- [[FrontendArchitecture]]
- [[DesktopDaemonControlPlane]]
- [[GatewayDaemonRouteMap]]
- [[ApiSurfaceCatalog]]
- [[WorkspaceUiMap]]
- [[DesignLanguageAndColorSystem]]
- [[TestingAndQualitySystem]]
- [[DocumentationDrift]]
- [[RefactorBacklog]]

## Maintenance

- Run graph rebuild after each ingestion wave.
- Run lint after each module wave.
- Treat the wiki as part of the delivery surface, not optional documentation.
```

- [ ] **Step 3: Expand the wiki index with Nion-specific sections**

Update `/Users/zhangtiancheng/Documents/wiki/wiki/index.md` so it contains these sections:

```md
# Wiki Index

## Overview
- [Overview](overview.md) — living synthesis across all sources

## Sources

## Entities

## Concepts
- [Nion Knowledge Base Contract](concepts/NionKnowledgeBaseContract.md) — rules, scope, and maintenance contract for compiling Nion into the wiki.

## Nion Maps
- [Nion Project Overview](concepts/NionProjectOverview.md) — product and system top-level navigation page.
- [Gateway Daemon Route Map](concepts/GatewayDaemonRouteMap.md) — backend route ownership and transport map.
- [Workspace UI Map](concepts/WorkspaceUiMap.md) — workspace surfaces, panels, and route-driven UI map.
- [Testing And Quality System](concepts/TestingAndQualitySystem.md) — test layers, contracts, and blind spots.

## Nion Audits
- [Documentation Drift](concepts/DocumentationDrift.md) — mismatches between docs and runtime reality.
- [Refactor Backlog](concepts/RefactorBacklog.md) — prioritized cleanup and restructuring backlog.

## Syntheses
```

- [ ] **Step 4: Append a log entry for contract freeze**

Prepend this entry to `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`:

```md
## [2026-04-13] update | Nion knowledge-base contract frozen

- Added Nion-specific scope, taxonomy, and maintenance rules.
- Declared the wiki to be a maintained delivery surface for Nion.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add /Users/zhangtiancheng/Documents/wiki/AGENTS.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionKnowledgeBaseContract.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/index.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/log.md
git commit -m "docs: freeze Nion wiki contract"
```

Expected: one commit containing only the workspace contract/index/log changes.

### Task 2: Build The Nion Top-Level Navigation Layer

**Files:**
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionProjectOverview.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/RepositoryStructure.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BackendArchitecture.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendArchitecture.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/DesktopDaemonControlPlane.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`

- [ ] **Step 1: Read the top-level repo guides and runtime entrypoints**

Run: `sed -n '1,260p' README.md && printf '\n---\n' && sed -n '1,260p' backend/CLAUDE.md && printf '\n---\n' && sed -n '1,260p' frontend/CLAUDE.md && printf '\n---\n' && sed -n '1,260p' backend/app/runtime/app_factory.py`
Expected: enough context to describe repo purpose, backend/frontend/desktop split, and runtime bootstrapping.

- [ ] **Step 2: Write `NionProjectOverview.md`**

Create `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionProjectOverview.md` with sections:

```md
---
title: "Nion Project Overview"
type: concept
tags: [nion, architecture, overview]
sources: []
last_updated: 2026-04-13
---

## Product Shape
## System Surfaces
## Primary Execution Chains
## Major Domain Areas
## Current Architectural Risks
## Key Linked Pages
```

Requirements:
- Must link to `[[RepositoryStructure]]`, `[[BackendArchitecture]]`, `[[FrontendArchitecture]]`, `[[DesktopDaemonControlPlane]]`.
- Must describe Nion as desktop-first multi-surface system, not as a generic web app.

- [ ] **Step 3: Write `RepositoryStructure.md`, `BackendArchitecture.md`, `FrontendArchitecture.md`, `DesktopDaemonControlPlane.md`**

Each page must follow the same pattern:

```md
## Purpose
## Owner Files
## Boundary
## Runtime Flow
## Truth Sources
## Risks / Drift / Residue
## Related Pages
```

Use exact owner files pulled from the codebase rather than vague summaries.

- [ ] **Step 4: Index and log the new top-level navigation layer**

Add these entries under `## Concepts` in `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`:

```md
- [Nion Project Overview](concepts/NionProjectOverview.md) — top-level map of product surfaces, domains, and execution chains.
- [Repository Structure](concepts/RepositoryStructure.md) — how code and docs are partitioned across the repo.
- [Backend Architecture](concepts/BackendArchitecture.md) — backend app, packages, and server-side ownership map.
- [Frontend Architecture](concepts/FrontendArchitecture.md) — workspace shell, route model, and client-side ownership map.
- [Desktop Daemon Control Plane](concepts/DesktopDaemonControlPlane.md) — desktop shell, daemon, and runtime control relationship.
```

Prepend this log entry:

```md
## [2026-04-13] ingest | Nion top-level navigation layer

- Added project overview and top-level architecture pages for repo, backend, frontend, and desktop/daemon control plane.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add /Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionProjectOverview.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/RepositoryStructure.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/BackendArchitecture.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendArchitecture.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/DesktopDaemonControlPlane.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/index.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/log.md
git commit -m "docs: add Nion top-level architecture pages"
```

### Task 3: Build Core Owner Maps And Runtime Maps

**Files:**
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/GatewayDaemonRouteMap.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/ApiSurfaceCatalog.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendModuleMap.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/TestingAndQualitySystem.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`

- [ ] **Step 1: Read backend route and router files**

Run: `rg -n "APIRouter|router =" backend/app backend/app/gateway backend/app/daemon | sed -n '1,240p'`
Expected: a list of gateway and daemon route owner files to anchor the route map and API catalog.

- [ ] **Step 2: Read frontend route and shell files**

Run: `sed -n '1,260p' frontend/src/core/navigation/desktop-routes.ts && printf '\n---\n' && rg -n "page\\.tsx|route|workspace" frontend/src/app frontend/src/components/workspace | sed -n '1,260p'`
Expected: enough context to map UI modules to routes and shell ownership.

- [ ] **Step 3: Write the four owner-map pages**

Requirements:
- `GatewayDaemonRouteMap.md` must separate gateway API vs daemon control plane.
- `ApiSurfaceCatalog.md` must group APIs by product domain rather than file path alone.
- `FrontendModuleMap.md` must map workspace features to modules and owner files.
- `TestingAndQualitySystem.md` must describe contract tests, backend tests, desktop tests, blind spots, and what each layer protects.

- [ ] **Step 4: Update index and log**

Add these index entries:

```md
- [Gateway Daemon Route Map](concepts/GatewayDaemonRouteMap.md) — route ownership split between gateway and daemon.
- [API Surface Catalog](concepts/ApiSurfaceCatalog.md) — domain-organized catalog of runtime APIs.
- [Frontend Module Map](concepts/FrontendModuleMap.md) — workspace modules, screens, and owner files.
- [Testing And Quality System](concepts/TestingAndQualitySystem.md) — test layers, contracts, and coverage boundaries.
```

Prepend this log entry:

```md
## [2026-04-13] ingest | Nion owner and runtime maps

- Added route, API, frontend module, and testing system maps.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add /Users/zhangtiancheng/Documents/wiki/wiki/concepts/GatewayDaemonRouteMap.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/ApiSurfaceCatalog.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendModuleMap.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/TestingAndQualitySystem.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/index.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/log.md
git commit -m "docs: add Nion owner maps"
```

### Task 4: Build Domain Deep Dives For Core Product Systems

**Files:**
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/MemorySoulUserIdentityMainline.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NotebookSystem.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/AutomationSystem.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/CustomAgentOrchestration.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`

- [ ] **Step 1: Read the approved specs and current module owners for each domain**

Run:

```bash
sed -n '1,260p' docs/superpowers/specs/2026-04-09-memory-soul-boundary-contracts-design.md && printf '\n---\n' && \
rg -n "memory|soul|user identity|notebook|automation|custom agent" docs backend frontend | sed -n '1,260p'
```

Expected: source set for the four domain deep dives plus the approved constraints for Memory/Soul.

- [ ] **Step 2: Write `MemorySoulUserIdentityMainline.md`**

Requirements:
- Must explicitly name approved design docs as truth.
- Must describe user-facing chain, internal governance chain, and known residue.
- Must not reintroduce proposal semantics.

- [ ] **Step 3: Write `NotebookSystem.md`, `AutomationSystem.md`, and `CustomAgentOrchestration.md`**

Each page must include:

```md
## User-visible capability
## Backend owners
## Frontend owners
## Runtime flow
## Truth ownership
## Current edge cases and cleanup opportunities
```

- [ ] **Step 4: Update index and log**

Add index entries for all four pages under `## Concepts`. Prepend this log entry:

```md
## [2026-04-13] ingest | Nion domain deep dives

- Added deep dives for Memory/Soul/UserIdentity, Notebook, Automation, and Custom Agent Orchestration.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add /Users/zhangtiancheng/Documents/wiki/wiki/concepts/MemorySoulUserIdentityMainline.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/NotebookSystem.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/AutomationSystem.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/CustomAgentOrchestration.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/index.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/log.md
git commit -m "docs: add Nion domain deep dives"
```

### Task 5: Build Supporting Backend Subsystem Deep Dives

**Files:**
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/ModelAdminAndConfigCenter.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/UploadsAndArtifactsPipeline.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BridgeAndChannelSystem.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`

- [ ] **Step 1: Read the subsystem owners already identified by existing repo plans**

Run:

```bash
sed -n '1,260p' docs/plans/2026-04-12-project-knowledge-base-full-ingestion-plan.md && printf '\n---\n' && \
sed -n '1,220p' backend/app/gateway/routers/model_admin.py && printf '\n---\n' && \
sed -n '1,220p' backend/app/gateway/routers/uploads.py && printf '\n---\n' && \
sed -n '1,220p' backend/app/daemon/routers/channels.py
```

Expected: concrete owner files for model/config, uploads/artifacts, and bridge/channel system.

- [ ] **Step 2: Write `ModelAdminAndConfigCenter.md`**

Must cover:
- provider templates / provider instances / bindings
- config persistence owner
- runtime schema / status surfaces
- YAML/bootstrap residue if any

- [ ] **Step 3: Write `UploadsAndArtifactsPipeline.md` and `BridgeAndChannelSystem.md`**

Must cover:
- upload and artifact path semantics
- conversion / access chain
- bridge vs daemon vs channel ownership
- diagnostics / incidents / platform adapter complexity

- [ ] **Step 4: Update index and log**

Add index entries for the three subsystem pages and prepend this log entry:

```md
## [2026-04-13] ingest | Nion backend subsystem deep dives

- Added deep dives for model/config center, uploads/artifacts, and bridge/channel runtime.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add /Users/zhangtiancheng/Documents/wiki/wiki/concepts/ModelAdminAndConfigCenter.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/UploadsAndArtifactsPipeline.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/BridgeAndChannelSystem.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/index.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/log.md
git commit -m "docs: add Nion backend subsystem deep dives"
```

### Task 6: Build UI, Interaction, And Visual Language Pages

**Files:**
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/WorkspaceUiMap.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/SettingsUiMap.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/MemoryUiMap.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/DesignLanguageAndColorSystem.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`

- [ ] **Step 1: Read frontend design docs and top-level workspace components**

Run:

```bash
sed -n '1,260p' frontend/DESIGN.md && printf '\n---\n' && \
rg -n "workspace|settings|memory|sidebar|header|panel" frontend/src/components/workspace frontend/src/app | sed -n '1,260p'
```

Expected: enough context to describe page families, layout shells, and major UI surfaces.

- [ ] **Step 2: Write `WorkspaceUiMap.md`, `SettingsUiMap.md`, and `MemoryUiMap.md`**

Each page must include:

```md
## Main screens
## Panels and navigation
## Key interactive workflows
## Backing state / API owners
## Known UI drift or residue
```

- [ ] **Step 3: Write `DesignLanguageAndColorSystem.md`**

The page must explicitly capture:
- current palette and visual semantics where visible
- typography / layout hierarchy if visible
- product-level visual language
- where design drift exists
- where the UI appears inconsistent across modules

- [ ] **Step 4: Update index and log**

Add index entries for the four UI/design pages and prepend this log entry:

```md
## [2026-04-13] ingest | Nion UI and visual language maps

- Added workspace, settings, memory, and design-language pages.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add /Users/zhangtiancheng/Documents/wiki/wiki/concepts/WorkspaceUiMap.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/SettingsUiMap.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/MemoryUiMap.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/DesignLanguageAndColorSystem.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/index.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/log.md
git commit -m "docs: add Nion UI system pages"
```

### Task 7: Build Drift, Residue, And Remediation Pages

**Files:**
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/DocumentationDrift.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BackendResidueInventory.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendResidueInventory.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BusinessLogicGapInventory.md`
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/RefactorBacklog.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/project-knowledge-map.md`

- [ ] **Step 1: Read existing review docs and the current knowledge-map navigation**

Run:

```bash
for f in docs/reviews/2026-04-09-memory-soul-strict-review.md \
  docs/reviews/2026-04-11-memory-soul-implementation-gap-audit.md \
  docs/reviews/2026-04-11-memory-soul-user-identity-backend-strict-audit.md \
  docs/project-knowledge-map.md; do
  echo "===== $f ====="
  sed -n '1,260p' "$f"
done
```

Expected: evidence base for drift, residue, business gaps, and remediation backlog.

- [ ] **Step 2: Write the five audit / backlog pages**

Page requirements:
- `DocumentationDrift.md` must capture source-of-truth conflicts.
- `BackendResidueInventory.md` and `FrontendResidueInventory.md` must separate active chain from dead chain.
- `BusinessLogicGapInventory.md` must describe missing closure in user-visible logic.
- `RefactorBacklog.md` must be prioritized rather than a dump list.

- [ ] **Step 3: Update the repo knowledge-map document**

Revise `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/project-knowledge-map.md` so it points to the new `/Users/zhangtiancheng/Documents/wiki` pages, not the stale `~/wiki` assumptions.

- [ ] **Step 4: Update index and log**

Add entries for the five pages under `## Nion Audits` or `## Concepts` as appropriate. Prepend this log entry:

```md
## [2026-04-13] ingest | Nion drift and remediation inventory

- Added drift, residue, business-gap, and refactor backlog pages.
```

- [ ] **Step 5: Commit**

Run:

```bash
git add /Users/zhangtiancheng/Documents/wiki/wiki/concepts/DocumentationDrift.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/BackendResidueInventory.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendResidueInventory.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/BusinessLogicGapInventory.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/concepts/RefactorBacklog.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/index.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/log.md \
  /Users/zhangtiancheng/Documents/项目/agent/nion/docs/project-knowledge-map.md
git commit -m "docs: add Nion drift and remediation pages"
```

### Task 8: Build The Knowledge Graph And Continuous Sync Loop

**Files:**
- Create: `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionKnowledgeSyncWorkflow.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/index.md`
- Modify: `/Users/zhangtiancheng/Documents/wiki/wiki/log.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/README.md`

- [ ] **Step 1: Write the sync workflow page**

Create `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionKnowledgeSyncWorkflow.md` with sections:

```md
## When the wiki must be updated
## What kinds of code changes map to what wiki pages
## Required update checklist for product / API / UI / state / residue changes
## Graph rebuild cadence
## Lint cadence
## Failure modes if the wiki is not maintained
```

- [ ] **Step 2: Add the sync page to the index**

Add this line under `## Nion Maps`:

```md
- [Nion Knowledge Sync Workflow](concepts/NionKnowledgeSyncWorkflow.md) — rules for keeping the wiki and graph in sync with code changes.
```

- [ ] **Step 3: Add a repository entrypoint note**

Update `/Users/zhangtiancheng/Documents/项目/agent/nion/README.md` with a short “Project knowledge base” section linking to:
- `/Users/zhangtiancheng/Documents/wiki`
- `docs/project-knowledge-map.md`
- the expectation that major feature changes must update the wiki

- [ ] **Step 4: Rebuild graph and run query/lint verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/wiki
.venv/bin/python tools/build_graph.py --no-infer
.venv/bin/python tools/query.py "What are the major subsystems and knowledge areas in Nion?"
```

Expected:
- graph files are generated
- query returns a non-empty structured answer referencing the new concept pages

- [ ] **Step 5: Prepend final log entry**

Add:

```md
## [2026-04-13] graph | Nion knowledge graph rebuilt

- Rebuilt graph after core Nion knowledge-base ingestion.
- Established ongoing sync workflow for future feature changes.
```

- [ ] **Step 6: Commit**

Run:

```bash
git add /Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionKnowledgeSyncWorkflow.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/index.md \
  /Users/zhangtiancheng/Documents/wiki/wiki/log.md \
  /Users/zhangtiancheng/Documents/wiki/graph/graph.json \
  /Users/zhangtiancheng/Documents/wiki/graph/graph.html \
  /Users/zhangtiancheng/Documents/项目/agent/nion/README.md
git commit -m "docs: establish Nion knowledge sync workflow"
```

## Self-Review

- Spec coverage: the plan covers workspace contract, architecture, domain systems, backend subsystems, UI/design pages, audits/backlog, graph generation, and continuous sync workflow.
- Placeholder scan: no unresolved placeholders remain; every task has exact file targets and commands.
- Type consistency: concept page names are stable PascalCase markdown basenames and reused consistently across index, logs, and query expectations.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-13-nion-knowledge-base-and-graph-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - 我按任务逐个派 fresh subagent 执行、每个任务之间做 review
2. Inline Execution - 我在当前会话按这个计划顺序执行

你定执行方式即可。
