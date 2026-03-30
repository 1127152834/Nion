# Nion OpenViking Memory OS Design

## Context

Nion currently has multiple partially overlapping memory-related systems:

- structured long-term memory backed by `memory.json`
- transcript recall backed by `recall.sqlite3`
- notebook resource ingest and retrieval backed by embedded OpenViking stores
- AutoDream journal and scheduler state backed under the embedded OpenViking runtime root

This layering was useful for bootstrapping the first notebook, retrieval, and AutoDream slices, but it no longer matches the desired product direction.

The target direction is now explicit:

1. Nion should adopt a **pluggable memory system** similar in spirit to Memoh's memory-provider architecture.
2. Nion should no longer use `memory.json` as a runtime memory backend.
3. Nion should support three provider families:
   - `builtin`
   - `mem0`
   - `openviking`
4. `openviking` must support both:
   - `embedded`
   - `remote`
5. Notebook, AutoDream, identity, and soul must be part of the same product-level Memory OS rather than separate side systems.

This document defines that Memory OS.

## Goal

Design a unified, pluggable **Memory OS** for Nion that:

- replaces `memory.json` as the runtime memory backend
- treats memory as a provider-driven capability surface, not a hard-coded file format
- preserves local ownership of critical assets
- makes OpenViking the default flagship provider
- keeps Built-in and Mem0 as first-class providers with the same product-level contract
- establishes a clean foundation for heartbeat, AutoDream, identity, soul, and future self-evolution workflows

## Non-Goals

1. This document does not define the exact implementation plan or task breakdown.
2. This document does not require copying Memoh source code or reproducing its server/container architecture.
3. This document does not design a multi-bot container platform for Nion.
4. This document does not define final UI visuals in pixel detail.
5. This document does not require every provider to own every domain's canonical data source.

## Core Product Decision

Nion will move from a **memory-mechanism mindset** to a **Memory OS mindset**.

That means:

- memory is no longer "the `memory.json` feature"
- notebook retrieval is no longer "a separate OpenViking debug system"
- AutoDream is no longer "just a journal"
- identity and soul are no longer ad hoc prompt files

Instead, they become part of a unified system with:

- a provider contract
- a domain model
- runtime hooks
- operator tooling
- user-facing memory controls

## The Three Provider Families

Nion will support exactly three provider families in v1 of this architecture:

1. **Built-in**
2. **Mem0**
3. **OpenViking**

These families are product-visible and first-class.

### 1. Built-in

Built-in is Nion's own local memory provider family.

It exists to provide:

- a lightweight local-first option
- an offline-capable option
- a zero-dependency baseline
- a stable fallback provider even when external systems are unavailable

Built-in should support three modes:

- `off`
- `sparse`
- `dense`

Meaning:

- `off`: no long-term retrieval beyond minimal runtime continuity
- `sparse`: lightweight lexical or sparse-vector retrieval
- `dense`: local semantic retrieval through embedding/vector infrastructure

Built-in is **not** `memory.json`.
It is a new provider family with its own storage, retrieval, maintenance, and status model.

### 2. Mem0

Mem0 is a third-party provider family integrated through Nion's provider contract.

It exists to support:

- externally hosted memory
- teams that prefer SaaS-managed memory infrastructure
- users who want to plug Nion into an external memory backend

Mem0 must be treated as a full provider from the perspective of Nion's product contract.

That means Nion cannot expose Mem0 as "search-only" or "partial memory."
If Mem0 is selected, the Memory OS must still support all required domains and operations through the Mem0 provider adapter.

### 3. OpenViking

OpenViking is the flagship provider family and the recommended default for Nion.

It is the only provider family explicitly designed to become the center of:

- notebook-aware memory
- agent memory
- AutoDream
- identity and soul evolution
- future self-upgrade workflows

OpenViking must support two deployment modes:

- `embedded`
- `remote`

#### Embedded OpenViking

Embedded mode runs inside Nion's local desktop-owned runtime and stores data under the Nion app data root.

It is the default recommended configuration because it best matches:

- desktop-first operation
- local-first ownership
- notebook integration
- auditability
- future self-evolution workflows

#### Remote OpenViking

Remote mode connects to an external OpenViking service.

It exists for:

- advanced self-hosting
- shared memory infrastructure
- teams that want a separate OpenViking deployment
- compatibility with an external OpenViking ecosystem

Remote mode must still conform to the same Nion provider contract.

## Product-Level Provider Contract

Every provider family must support the full Memory OS product contract.

### Domains

Every provider must support these logical domains:

- `notebook`
- `user_memory`
- `agent_memory`
- `autodream_journal`
- `identity`
- `soul`

This means the UI and runtime can treat every provider as capable of handling the same Memory OS surface.

It does **not** mean every provider must own the canonical source for every domain.

### Operations

Every provider must support these operations:

- `add`
- `search`
- `list`
- `update`
- `delete`
- `delete_batch`
- `delete_all`
- `compact`
- `rebuild`
- `status`
- `usage`

### Runtime Hooks

Every provider must support runtime integration hooks:

- `on_before_chat`
- `on_after_chat`

These are the memory analogues of:

- context assembly before a run
- extraction and updates after a run

### Capability Reporting

Every provider must expose a capability surface so the UI can still explain quality differences.

Examples:

- whether notebook handling is native or adapted
- whether compaction is native or adapter-driven
- whether vector retrieval is supported
- whether rebuild is full or partial
- whether remote service health is available

The important distinction:

- **feature presence** must be consistent
- **implementation quality or nativeness** may vary

## Canonical Asset Ownership

This is the most important boundary in the system.

Nion must distinguish between:

1. **product-level provider support**
2. **canonical asset ownership**

These are not the same.

### Why This Distinction Exists

If every provider becomes the final owner of every memory-related asset, Nion loses:

- local user asset ownership
- deterministic identity loading
- stable audit trails
- safe migration and rollback

That would be unacceptable for a desktop-first, local-first product.

### Canonical Ownership Rules

#### Notebook

Notebook remains user-owned.

Canonical source:

- `~/.nion-data/notebook`

Providers must support the `notebook` domain, but they do so through:

- indexing
- synchronization
- retrieval
- domain records

They do not become the canonical owner of the notebook source files.

#### Identity

Identity should have a canonical local representation.

Examples:

- system-owned identity document
- bot-specific identity record
- future `IDENTITY.md`-style artifact

Providers support the `identity` domain, but runtime loading must remain deterministic rather than relying only on ranked retrieval.

#### Soul

Soul should also have a canonical local representation because it functions as:

- a durable self-definition layer
- a behavior and principle layer
- a self-revision target

Providers must support `soul`, but Nion should retain a stable canonical artifact.

#### AutoDream Journal

Dream Logs are reflective and auditable artifacts.

They should remain locally auditable even when the active provider is Mem0 or remote OpenViking.

Providers support the `autodream_journal` domain for:

- search
- indexing
- maintenance
- rebuild
- analytics

But Nion should retain canonical Dream Log artifacts under local control.

#### User Memory And Agent Memory

These are provider-owned runtime domains.

Unlike notebook and canonical reflective/identity artifacts, these are appropriate to store directly inside the active provider as the main runtime memory substrate.

## The Role Of `memory.json`

`memory.json` exits the runtime architecture.

This is a hard design decision.

### What It Stops Being

It will no longer be:

- the default runtime memory backend
- the active long-term memory source
- the structure that the Memory page is built around

### What It Becomes

It becomes:

- a legacy import source
- a migration source of truth for old installs
- an optional export or backup artifact if needed

### Migration Rule

When the new Memory OS boots for the first time:

1. detect whether legacy `memory.json` exists
2. offer or perform a one-time import into the selected provider
3. preserve the old file as a legacy backup
4. stop using it in runtime flows afterward

## Domain Model

The Memory OS consists of six main domains.

### 1. Notebook

Purpose:

- user-authored documents and knowledge resources
- second-brain source material
- durable reference material for retrieval

Canonical source:

- local notebook filesystem

Provider role:

- represent notebook entries in provider search space
- synchronize document-derived records
- expose notebook-aware retrieval and maintenance

### 2. User Memory

Purpose:

- extracted durable knowledge about the user
- preferences
- ongoing projects
- stable facts
- high-value personal context

Canonical source:

- active provider

### 3. Agent Memory

Purpose:

- agent operational lessons
- heuristics
- project-specific execution knowledge
- reusable working patterns

Canonical source:

- active provider

### 4. AutoDream Journal

Purpose:

- reflective logs
- summaries of what happened
- what mattered
- what changed
- what should be promoted or pruned

Canonical source:

- local Dream Log artifacts

Provider role:

- search
- indexing
- maintenance
- future analytics and rebuild

### 5. Identity

Purpose:

- role definition
- task framing
- behavioral constraints
- self-description used by the runtime

Canonical source:

- local identity artifact(s)

Provider role:

- searchable representation
- maintenance support
- historical evolution visibility

### 6. Soul

Purpose:

- higher-level self-narrative
- value system
- long-horizon personal evolution layer for the agent
- subjective, durable self-revision target

Canonical source:

- local soul artifact(s)

Provider role:

- searchable representation
- maintenance support
- reflective linkage to AutoDream and heartbeat

## Heartbeat, AutoDream, And Self-Evolution

Nion should treat these as separate but linked subsystems.

### Heartbeat

Heartbeat is a periodic autonomous session mechanism.

It is not memory itself.

It should:

- run on a configured interval
- produce execution logs
- use a dedicated model if needed
- trigger routine maintenance or observation work

Heartbeat belongs to the runtime maintenance layer.

### AutoDream

AutoDream is a reflective consolidation process.

It is not just journaling and not just memory extraction.

It should:

- gather signals from notebook, recall, user memory, agent memory, previous dream logs, and recent runs
- write a Dream Log
- propose promotions, pruning, and actions
- feed compact and rebuild pipelines

### Self-Evolution

Self-evolution is not a single feature.

It is the higher-order loop formed by:

- heartbeat
- recall and notebook signals
- AutoDream
- memory compaction
- memory rebuild
- identity and soul update proposals
- future action or skill proposals

The design principle is:

`Observe -> Reflect -> Consolidate -> Update Identity -> Act`

## Provider Implementation Modes

Not every provider needs to implement every domain in the same way.

For each domain, a provider may be:

- `native`
- `adapted`
- `mirrored`

### Native

The provider has first-class structures and semantics for the domain.

OpenViking is expected to be native for:

- user memory
- agent memory
- AutoDream
- notebook-aware retrieval
- eventually identity and soul

### Adapted

The provider supports the domain through a translation layer.

Mem0 is expected to support several domains this way by mapping:

- domain type
- namespace
- metadata
- indexing semantics

into its own memory representation.

### Mirrored

The provider indexes or synchronizes a domain whose canonical data lives locally elsewhere.

Notebook, identity, soul, and Dream Log artifacts will often be mirrored domains.

This is not a weakness.
It is the correct design for asset ownership.

## Why OpenViking Is Still The Flagship Provider

If all providers support the same product-level contract, why is OpenViking still special?

Because OpenViking is the only provider family intended to become Nion's full memory substrate rather than an adapter-compatible backend.

It is expected to be best-in-class for:

- notebook integration
- embedded desktop operation
- rich domain support
- auditability
- reflective workflows
- identity and soul evolution
- future self-upgrade flows

In short:

- all providers are contract-complete
- OpenViking is the best-fit canonical implementation for the full system vision

## Frontend Information Architecture

The current memory settings page mixes:

- runtime configuration
- user memory search
- operator debugging
- OpenViking inspection
- AutoDream control

That structure is no longer acceptable once Memory OS exists.

The frontend should move to a three-surface model.

### 1. Memory Provider

Purpose:

- choose the active provider family
- configure provider mode
- inspect provider health and capability status

Content:

- provider selector: Built-in / Mem0 / OpenViking
- built-in mode selector: off / sparse / dense
- OpenViking mode selector: embedded / remote
- provider configuration form
- provider status and capabilities

### 2. Memory Console

Purpose:

- manage runtime memory domains
- search and inspect entries
- run compact and rebuild

Content:

- global search
- domain filters
- list/edit/delete memory entries
- compact action
- rebuild action
- usage / health / sync indicators

### 3. Agent Core

Purpose:

- expose the higher-order cognitive maintenance surfaces

Content:

- AutoDream controls and logs
- heartbeat controls and logs
- identity viewer/editor
- soul viewer/editor
- evolution proposals and maintenance history

The key change:

the current "Memory Settings" page is no longer a settings card stack.
It becomes a product console for Memory OS.

## API Shape Direction

This document does not define final endpoint names, but it does define the required surface categories.

### Provider Management

Required surfaces:

- list available provider families
- list configured provider instances
- create provider instance
- update provider instance
- delete provider instance
- bind active provider
- inspect provider status
- inspect provider capabilities

### Memory Console

Required surfaces:

- search across domains
- list by domain
- create memory item
- update memory item
- delete memory item
- delete batch
- compact
- rebuild
- usage

### Agent Core

Required surfaces:

- list Dream Logs
- trigger AutoDream
- list heartbeat runs
- configure heartbeat
- read and update identity
- read and update soul
- surface evolution proposals

## Nion Runtime Responsibilities

The runtime must stop talking directly to a legacy storage shape and instead talk to the selected provider.

That means:

1. context assembly calls provider hooks
2. post-run capture calls provider hooks
3. retrieval is provider-mediated
4. maintenance actions are provider-mediated
5. canonical local assets are synchronized into the provider where appropriate

## Migration Strategy

Migration should happen in four stages.

### Stage 1: Introduce Provider Architecture

- add provider contract
- add provider registry
- add provider binding
- wrap current runtime behind provider APIs

### Stage 2: Introduce Built-in And OpenViking Providers

- implement built-in provider
- implement OpenViking embedded and remote provider modes
- stop direct runtime dependence on `memory.json`

### Stage 3: Move Product Surfaces

- replace memory settings page with Memory OS surface
- separate provider configuration, memory console, and agent core
- add domain-aware inspection and management

### Stage 4: Introduce Heartbeat / Identity / Soul Integration

- formalize heartbeat
- formalize identity and soul artifacts
- connect AutoDream, compact, rebuild, and evolution proposals

### Legacy Import Rule

Legacy `memory.json` import happens only during migration and recovery flows.

It should not remain in the active runtime hot path.

## Risks

### 1. Contract Inflation

If the provider contract becomes too broad too early, implementation cost may spike.

Mitigation:

- keep the contract broad at product level but phase implementation carefully
- allow native/adapted/mirrored support modes

### 2. Provider Weakest-Link Design

If all providers are forced into the same lowest-common-denominator semantics, Memory OS becomes weak.

Mitigation:

- standardize feature presence
- do not standardize away quality differences
- expose capability metadata honestly in UI

### 3. Canonical Asset Confusion

If engineers confuse provider support with data ownership, notebook and soul boundaries will collapse.

Mitigation:

- codify canonical ownership explicitly in implementation docs
- keep notebook, soul, identity, and Dream Logs locally canonical

### 4. UI Bloat

If provider config, memory console, and operator surfaces stay mixed together, the product will remain confusing.

Mitigation:

- separate the three surfaces by intent

## Final Recommendation

Nion should build a **Pluggable Memory OS** with:

- three provider families:
  - Built-in
  - Mem0
  - OpenViking
- OpenViking as the flagship default provider
- embedded and remote OpenViking deployment modes
- full provider-level support for all Memory OS domains
- canonical local ownership for notebook, identity, soul, and Dream Log artifacts
- complete removal of `memory.json` from runtime memory architecture

This gives Nion the right long-term foundation for:

- second-brain notebook integration
- agent memory
- AutoDream
- heartbeat
- soul and identity
- self-evolution
- desktop-first local ownership

without forcing the entire system to collapse into a single hard-coded backend or a single external service.
