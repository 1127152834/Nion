---
name: agent-application-architect
description: Use when designing, reviewing, refactoring, or debugging an agent application, agent platform, AI assistant runtime, multi-agent system, skills system, memory architecture, tool runtime, gateway service, scheduled automation, plugin/provider architecture, or any persistent tool-using agent. Trigger on requests to plan or evaluate agent architectures, compare agent frameworks, define runtime boundaries, or create a production-grade agent application expert skill.
---

# Agent Application Architect

## Overview

Use this skill to reason about agent applications as software systems, not as prompt bundles. It helps design or review runtimes, sessions, memory layers, tool boundaries, delegation models, service surfaces, plugin contracts, failure modes, and evolution paths for production-grade agents.

## Core Use Cases

- Design a new agent application, persistent assistant, operator, or platform.
- Review an existing agent architecture and find missing runtime boundaries.
- Compare multiple agent systems or frameworks before making architectural choices.
- Refactor a growing agent codebase into clearer contracts.
- Define memory, skills, tool runtime, gateway, cron, or plugin/provider architecture.
- Turn scattered agent ideas into a coherent production-grade runtime design.
- Draft or improve a specialized expert skill for agent application development.

## Operating Principle

Treat the target as a runtime with explicit contracts. Never reduce an agent system to “model + tools + memory” without asking how session boundaries, prompt layers, execution surfaces, delivery, failure handling, and evolution are actually organized.

## Workflow

### 1. Classify the agent type first

Before giving architecture advice, classify the target into one or more of:

- Capability agent
- Task runtime agent
- Persistent service agent
- Hybrid agent

Use [expert-skill-review-framework.md](./REF/hermes-wiki/expert-skill-review-framework.md) to decide which design surfaces matter most.

### 2. Diagnose architecture by boundary, not by feature list

Always inspect the system through these boundaries:

- Runtime boundary
- Prompt/context boundary
- Memory boundary
- Tool boundary
- Delegation boundary
- Service/time boundary
- Extension boundary
- Failure boundary

Do not accept vague proposals like “add memory”, “add subagents”, or “add a cron” until the contract of that subsystem is explicit.

### 3. Use the reference stack intentionally

Read only the references that answer the current question. Start with the smallest relevant set.

Suggested reading order:

1. [README.md](./REF/hermes-wiki/README.md)
2. [hermes-design-philosophy.md](./REF/hermes-wiki/hermes-design-philosophy.md)
3. [runtime-architecture.md](./REF/hermes-wiki/runtime-architecture.md)
4. [source-code-architecture.md](./REF/hermes-wiki/source-code-architecture.md)

Then branch:

- Prompt/memory/skills: [prompt-memory-skills.md](./REF/hermes-wiki/prompt-memory-skills.md)
- Compression/delegation/safety: [compression-delegation-safety.md](./REF/hermes-wiki/compression-delegation-safety.md)
- Service surfaces: [service-runtime-and-time-model.md](./REF/hermes-wiki/service-runtime-and-time-model.md)
- Plugins/providers: [plugin-and-provider-architecture.md](./REF/hermes-wiki/plugin-and-provider-architecture.md)
- Learning/self-evolution: [learning-loop-and-self-evolution.md](./REF/hermes-wiki/learning-loop-and-self-evolution.md)
- Patterns: [agent-design-patterns.md](./REF/hermes-wiki/agent-design-patterns.md)
- Tradeoffs: [design-tensions-and-tradeoffs.md](./REF/hermes-wiki/design-tensions-and-tradeoffs.md)
- Failure corpus: [evolution-and-failure-corpus.md](./REF/hermes-wiki/evolution-and-failure-corpus.md)
- Comparison: [cross-system-comparison.md](./REF/hermes-wiki/cross-system-comparison.md)
- Review rubric: [expert-skill-review-framework.md](./REF/hermes-wiki/expert-skill-review-framework.md)
- Future skill structure: [expert-skill-blueprint.md](./REF/hermes-wiki/expert-skill-blueprint.md)

Use [source-catalog.md](./REF/hermes-wiki/source-catalog.md) when you need evidence strength and provenance. Use [research-log.md](./REF/hermes-wiki/research-log.md) when you need the reasoning path and unresolved gaps.

### 4. Produce architecture outputs at the right level

Depending on the user request, output one of:

- A runtime critique
- A design recommendation with tradeoffs
- A boundary checklist
- A failure-mode audit
- A comparison table
- A staged evolution plan
- A skill design brief

Do not default to implementation details if the real problem is still architectural.

## Questions This Skill Should Force

When reviewing or designing an agent application, make sure the answer addresses as many of these as relevant:

1. What is a turn, and what is a session?
2. What is stable across the session, and what is recomputed per turn?
3. What information is default-present versus retrieved on demand?
4. Which tools are ordinary tools, and which mutate agent-internal state?
5. How are subagents isolated, and what returns to the parent?
6. What are the service entry points, and how is session continuity preserved?
7. What is scheduled versus user-triggered work?
8. Which layers are extensible, and which are single-select global strategies?
9. Where do failures occur: auth, prompt, tool, delivery, memory, compression?
10. What is the evolution path from current state to target architecture?
11. Which learning loops are built in, which are policy-driven, and which rely on an external optimizer?

## Anti-Patterns To Catch

Look for these immediately:

- Everything stuffed into one giant system prompt
- “Memory” treated as a bag of facts with no layering
- Tool systems with no distinction between runtime core and ordinary tools
- Subagents that inherit muddy context by default
- Cron jobs that reuse ambiguous conversation state
- Fallback that only exists at model-call time
- Delivery assumed successful because execution produced text
- Plugin systems with weak trust boundaries
- Self-improvement claims that blur built-in behavior, policy nudges, and offline optimization pipelines

See [expert-skill-review-framework.md](./REF/hermes-wiki/expert-skill-review-framework.md) and [design-tensions-and-tradeoffs.md](./REF/hermes-wiki/design-tensions-and-tradeoffs.md) for the detailed version.

## Output Style

- Prefer explicit contracts over motivational language.
- Prefer naming the tradeoff over pretending there is none.
- Prefer architecture diagrams in prose form: boundary, responsibility, data flow, failure mode.
- Challenge feature-centric thinking when the real issue is runtime design.

## Reference Index

Start with [INDEX.md](./REF/INDEX.md) to navigate the bundled knowledge base quickly.
