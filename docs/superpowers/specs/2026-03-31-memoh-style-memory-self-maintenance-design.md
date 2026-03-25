# Memoh-Style Memory, Heartbeat, And Self-Upgrade Design

> **Status:** Draft for product alignment  
> **Audience:** Product, architecture, frontend, backend  
> **Scope:** Personal AI assistant memory architecture for Nion desktop

## 1. Design Goal

Reframe Nion's long-term memory roadmap around the more mature Memoh skeleton:

- always-on continuity
- heartbeat
- memory compaction
- rebuild
- provider-driven memory runtime

Then integrate the core ideas previously discussed under `AutoDream` into Memoh-style self-maintenance and self-upgrade, instead of keeping `AutoDream` as a standalone product concept.

This design also resolves the current product-structure confusion:

- `Notebook` is **not** memory
- `Notebook` is the user's second brain / document knowledge base
- `Memory` is the agent's long-term structured memory system
- `Self-Maintenance` is the agent's reflective and autonomous maintenance loop
- `AutoDream` should not survive as a standalone user-facing concept

## 2. Product Positioning

Nion is not trying to replicate Memoh's multi-bot, multi-user, channel-heavy outer product shell.

Nion should replicate Memoh's **memory engine and autonomy skeleton**, but apply it to a different product shape:

- primary use case: personal AI assistant
- user-owned local notebook and files
- local-first second brain
- future project module for project-specific knowledge and context

Therefore:

- replicate Memoh's memory/provider/heartbeat/maintenance strengths
- do not replicate Memoh's multi-tenant product model

## 3. Product Domain Model

### 3.1 Top-Level Product Domains

Nion should eventually expose four separate user-facing domains:

1. **Knowledge Base**
2. **Memory**
3. **Self-Maintenance**
4. **Projects**

### 3.2 Domain Definitions

#### Knowledge Base

The user's second brain.

Contains:

- notebook files
- markdown documents
- personal notes
- research fragments
- life/work thinking
- topic collections
- long-form references

Characteristics:

- canonical source is local filesystem
- content is user-owned
- content may be fragmented and cross-topic
- content does not need to point to one project
- agent can read, search, cite, and help edit it
- content does not become memory by default

Canonical location:

- `~/.nion-data/notebook`

#### Memory

The agent's structured long-term memory system.

Contains:

- user memory
- agent memory
- facts
- summaries
- recall / memory search
- provider runtime state
- compaction/rebuild/status/usage metadata

Characteristics:

- provider-driven
- optimized for retrieval and context assembly
- maintained continuously
- not a file library

#### Self-Maintenance

The agent's own maintenance, reflection, and bounded self-upgrade domain.

Contains:

- heartbeat
- heartbeat logs
- maintenance triggers
- reflective logs
- compaction decisions
- rebuild decisions
- identity proposals
- soul proposals
- self-upgrade proposals
- maintenance plans
- upgrade proposals

Characteristics:

- not user notebook content
- not raw long-term memory
- a bounded maintenance loop for the agent itself

#### Projects

A future dedicated domain for project-scoped material.

Contains:

- project files and briefs
- project memory
- project context packs
- project-specific retrieval views
- project timelines and references

Characteristics:

- distinct from the second-brain notebook
- distinct from global long-term memory
- suitable for OpenViking-managed structured project resources

## 4. OpenViking Positioning

OpenViking should not be treated as a top-level user mental model.

It should be positioned as a **capability layer**, not a primary product page.

OpenViking is responsible for:

- resource registration
- URI addressing
- indexing
- retrieval
- context assembly
- provider-side memory visibility
- rebuild support

OpenViking may manage resources from:

- notebook / second brain
- future project module
- memory runtime structures

But that does not mean those domains become the same thing.

### Key Rule

`Notebook managed by OpenViking` does **not** imply `Notebook belongs to Memory`.

## 5. Memoh Alignment Strategy

### 5.1 What Nion Should Replicate

Nion should explicitly replicate the following Memoh capabilities:

1. **Provider-driven memory runtime**
2. **Built-in / Mem0 / OpenViking provider family**
3. **Heartbeat as a first-class autonomous maintenance trigger**
4. **Memory compaction**
5. **Memory rebuild**
6. **Memory runtime status**
7. **Memory usage / health visibility**
8. **Always-on continuity**

### 5.2 What Nion Should Extend Beyond Memoh

Nion should extend Memoh's backbone with:

1. **A reflective maintenance layer integrated into self-upgrade**
2. **Notebook as second brain**
3. **Stricter separation between user assets and agent assets**
4. **A future project knowledge domain separate from notebook**

### 5.3 What Nion Should Not Replicate

For now, Nion should not replicate:

- multi-bot product model
- multi-user sharing model
- cross-channel identity boundary complexity

These are not part of the current personal-assistant strategy.

## 6. Target Runtime Architecture

The maintenance stack should be restructured as follows:

### 6.1 Core Skeleton

1. **Always-On Continuity**
2. **Heartbeat**
3. **Compaction**
4. **Rebuild**
5. **Status / Usage**

### 6.2 Reflective Maintenance Overlay

The reflective layer should be built on top of that skeleton.

The reflective layer is not the scheduler.

The reflective layer is not the source of runtime continuity.

The reflective layer runs inside the maintenance loop and feeds bounded self-upgrade decisions.

### 6.3 Recommended Trigger Chain

```text
Heartbeat
  -> collect recent signals
  -> decide maintenance work
  -> run compaction if needed
  -> run rebuild if needed
  -> run reflective maintenance pass if needed
  -> emit logs / proposals / maintenance summary
```

## 7. Retiring AutoDream As A Product Term

`AutoDream` should not remain a primary user-facing product term.

Its useful ideas should be absorbed into the self-maintenance system as:

- reflective summarization
- proposal generation
- maintenance intelligence

Reflective maintenance outputs should include:

1. what happened recently
2. what the agent learned
3. which memories should be updated
4. which stale items should be pruned
5. which actions should be proposed
6. which identity / soul / workflow changes should be proposed later

This reflective layer should not be treated as:

- the user's notebook
- the user's journal
- the primary memory runtime
- a standalone branded subsystem that competes with heartbeat / compaction / rebuild

## 8. UI / IA Implications

### 8.1 Immediate Correction

The current memory settings surface should stop implying that notebook or OpenViking notebook operators are part of memory.

### 8.2 Eventual Navigation Model

Suggested navigation:

- `Knowledge Base`
- `Memory`
- `Self-Maintenance`
- `Projects`

### 8.3 Memory Page Should Contain

- provider selection / provider status
- memory search / recall
- facts / summaries
- compaction
- rebuild
- memory status
- memory usage

### 8.4 Self-Maintenance Page Should Contain

- heartbeat controls
- heartbeat logs
- reflective logs
- maintenance results
- compaction controls
- rebuild controls
- self-upgrade proposals
- future identity / soul proposal controls

### 8.5 Knowledge Base Page Should Contain

- notebook tree
- document management
- version history
- import/export
- second-brain search

### 8.6 OpenViking Visibility

OpenViking should only appear:

- as provider/runtime status detail
- as indexing/retrieval capability metadata
- as technical engine identity where helpful

It should not be the main user-facing page concept.

## 9. Gap Assessment Against Memoh

### Already Present In Nion

- provider registry and binding
- built-in / mem0 / openviking provider family
- runtime bridge away from `memory.json`
- OpenViking embedded / remote activation
- initial reflective-maintenance ideas, though not yet integrated into the right backbone

### Not Yet Fully Replicated

- heartbeat as first-class product/runtime capability
- compaction service and logs
- rebuild service and logs
- memory status / usage product surface
- full Mem0 provider implementation
- mature memory admin surface
- bounded self-upgrade proposal system

## 10. Strategic Recommendation

The next architecture phase should no longer be framed as "continue polishing AutoDream UI".

Instead, it should be framed as:

### Phase A

Build the Memoh-style memory maintenance backbone:

- heartbeat
- compaction
- rebuild
- status
- usage

### Phase B

Integrate reflective maintenance and self-upgrade proposals on top of that backbone.

### Phase C

Move notebook fully into the second-brain product lane, separate from memory.

### Phase D

Introduce the future project memory domain, also managed through OpenViking but distinct from notebook and memory.

## 11. Decision Summary

This design sets the following rules:

1. `Notebook` is not memory.
2. `OpenViking` is a capability layer, not a top-level user product category.
3. `Memory` and `Self-Maintenance` are separate product domains.
4. `Memoh` should be replicated at the backbone level, not at the outer product-shell level.
5. `Heartbeat / Compact / Rebuild / Always-On Continuity` become the core architecture.
6. `AutoDream` is retired as a standalone product concept; its useful ideas are integrated into the reflective self-maintenance and self-upgrade layer.
