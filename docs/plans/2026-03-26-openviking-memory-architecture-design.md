# OpenViking-Oriented Memory Architecture for Nion Desktop

## Goal

Evolve Nion from the current "structured memory + transcript recall" implementation into a unified desktop-native context system that separates:

- user-authored notebooks
- agent-extracted user memory
- agent self-memory and reusable patterns
- agent diary / reflection
- plan and workflow crystallization into skills

The target is not to bolt on another external memory service. The target is to make OpenViking-style context management the internal memory substrate of the desktop runtime.

## Current State

The current implementation has three real strengths:

1. Memory capture is asynchronous and operationally cheap.
   `MemoryMiddleware` filters messages and queues them into a debounced updater instead of blocking the user-facing turn.

2. Transcript recall is separated from structured memory.
   The system does not only keep summaries; it also archives raw recallable turns and can search them later.

3. Session policy already exists.
   Runtime context supports `session_mode`, `memory_read`, and `memory_write`, which is a good governance foundation.

But the current design is still transitional:

- structured memory is stored as one global JSON profile with coarse sections
- recall is a separate SQLite archive, not a unified context store
- memory injection is prompt-centric and flat
- there is no first-class notebook model
- there is no agent diary or reflective layer
- there is no durable bridge from diary/memory into plans, automations, or skills
- the README claims OpenViking single-stack memory, but the main codepath is still centered on `memory.json`

## Product Model

The user-facing mental model should become:

1. My notebooks
   User-authored, explicit, editable, Obsidian-like.

2. My memory
   Agent-extracted knowledge about the user, their preferences, people, projects, and decisions.

3. Agent notes
   The agent's own diary, reflections, lessons, and pending investigations.

4. My workflows
   Reusable automations and skills derived from repeated work.

These are not the same thing and should not share one storage contract.

## Recommended Domain Model

### A. User Notebooks

This is explicit user property. It should be treated as `Resource`, not `Memory`.

Examples:

- daily notes
- life notes
- work notes
- project notes
- employee dossiers
- research collections

Storage shape:

- notebook pages and attachments live as normal files in a user-visible folder
- the context system indexes them into a virtual context tree
- the user can edit these files directly without going through the agent

### B. User Memory

This is agent-extracted knowledge about the user, promoted from conversations and notebook usage.

Suggested buckets:

- profile
- preferences
- entities
- events

Examples:

- "User prefers concise Chinese replies"
- "Zhang San is the East China training owner"
- "The team decided to keep onboarding in Feishu"

### C. Agent Memory

This is the agent's learned operating knowledge, not the user's notes.

Suggested buckets:

- cases
- patterns
- project memory
- operator heuristics

Examples:

- "For this workspace, desktop renderer changes require `pnpm run build:renderer`"
- "This backend often runs from a different worktree than the UI repo"
- "When a daemon route looks missing, inspect the live process cwd before editing"

### D. Agent Diary

This should be introduced as a first-class reflective layer.

The diary is not just a transcript archive. It is the agent's subjective post-turn reflection:

- what happened today
- what the user actually cares about
- what went wrong
- what is unresolved
- what deserves follow-up research
- what probably should become a plan, automation, or skill

Recommended storage:

- `agent/journal/YYYY/MM/DD/<session-or-thread>.md`

Recommended structure:

- summary
- observed facts
- uncertainties
- mistakes / regrets
- hypotheses
- follow-up actions
- possible skill candidates

## OpenViking Mapping

OpenViking's model is a strong fit if treated as the internal context database.

Recommended mapping:

- `viking://resources/`
  user notebooks, imported docs, project repositories, meeting notes, employee records, attachments

- `viking://user/memories/`
  extracted user memory such as profile, preferences, entities, events

- `viking://agent/memories/`
  learned cases, patterns, project memory, operational memory

- `viking://agent/journal/`
  Nion-specific extension for diary/reflection

- `viking://agent/skills/`
  durable workflows, tool recipes, playbooks

This preserves the crucial boundary:

- notebook == user-authored resource
- memory == agent-authored cognition

## Retrieval Strategy

The retrieval path should stop being "inject some facts into prompt".

Use a planner-style context assembly pipeline:

1. Intent classification
   Detect whether the user is asking about a person, project, preference, past event, notebook content, or operational workflow.

2. Candidate search across domains
   Query:
   - user notebooks/resources
   - user memories
   - agent memories
   - diary
   - skills

3. Layered loading
   Use OpenViking-style L0/L1/L2:
   - L0 for fast relevance scan
   - L1 for planning context
   - L2 only when full detail is needed

4. Context pack assembly
   Build a bounded context pack with provenance:
   - why selected
   - source URI
   - confidence
   - freshness
   - access scope

5. Post-turn commit
   Archive the session, extract memory candidates, write diary entry, then evaluate follow-up actions.

## User Experience

Desktop should expose four primary surfaces:

1. Memory Search
   One unified search bar for people, projects, preferences, notebook pages, and conversation history.

2. Notebooks
   A visible notebook/file view with tags, folders, backlinks, and recent pages.

3. Agent Notes
   A timeline of diary entries and learned patterns.

4. Suggested Workflows
   Proposed automations, reminders, and skill candidates derived from repeated patterns.

For employee-oriented use cases, the user should be able to:

- keep explicit employee pages in notebooks/resources
- let the agent synthesize entity memories from those pages and from conversations
- search both at once
- see whether an answer came from a notebook page, extracted entity memory, or conversation history

## Skill and Automation Crystallization

Diary should not be a dead-end.

After diary generation, run lightweight promotion logic:

- repetitive task pattern -> suggest automation
- stable multi-step procedure -> suggest skill
- unresolved curiosity / research intent -> suggest reminder or scheduled research

This promotion should remain reviewable by the user.

Do not auto-create durable skills from a single diary entry.
Require repeated evidence or explicit confirmation.

## Architecture Changes Recommended

### Phase 1: Stabilize and Abstract

- introduce a `ContextStore` abstraction above `memory.json` and recall DB
- stop letting UI/features depend directly on `memory.json` shape
- formalize domains: resources, user memories, agent memories, diary, skills

### Phase 2: Bring Notebooks In

- add notebook root selection/import in desktop settings
- watch filesystem changes
- index notes and attachments as resources
- support person/project-oriented directory conventions

### Phase 3: Replace Flat Prompt Injection

- replace "top 15 facts" prompt injection with retrieval-time context packing
- make provenance observable in logs and debug UI

### Phase 4: Add Diary Pipeline

- create post-session diary writer
- split raw archive, structured summary, and reflective diary
- let diary feed candidate tasks / automations / skills

### Phase 5: OpenViking-Native Store

- embed OpenViking semantics into the desktop daemon
- either vendor the engine or implement the same storage contract internally
- keep it local-first, not SaaS-dependent

## Key Risks

1. Tenant confusion
   Current global memory shape is unsafe for future multi-user or organization scenarios.

2. Over-merging user notes and agent cognition
   If notebooks and extracted memory collapse into one thing, users will lose trust.

3. Reflection pollution
   Diary content is subjective and should not be promoted into truth without review.

4. Retrieval cost explosion
   Unified search without layered loading will become noisy and expensive.

5. Branch drift
   Repo docs already reference OpenViking-first memory, but the main implementation does not yet match that contract.

## Recommendation

The best direction is:

- treat OpenViking as the internal context model
- treat notebooks as user-owned resources
- treat memory as agent-extracted cognition
- add a first-class diary layer
- connect diary outputs to plans, reminders, and skills
- keep the whole stack embedded inside the desktop daemon

That gives Nion a coherent "second brain" architecture instead of multiple partially overlapping memory mechanisms.
