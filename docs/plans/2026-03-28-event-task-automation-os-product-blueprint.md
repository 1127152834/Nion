# Event Task Automation OS Product Blueprint

## Purpose

Define the complete product line for Nion's event-driven automation system so the feature evolves as a coherent product surface instead of drifting between:

- a small hooks feature
- a scheduler add-on
- a scripting surface
- a diagnostics console

This blueprint establishes one unified thesis:

**Nion should become an automation operating system that can act on time, events, failures, and human-intervention moments with user-controlled rules and self-contained execution packages.**

This document sits above implementation plans. It explains what the product is, how users should mentally model it, how the product line expands over time, and how the module should fit with chat, automation, notebook, bridge, and diagnostics.

## Product Thesis

Today Nion already has pieces of the future product:

- chat lifecycle
- automation scheduler
- clarification / permission interrupts
- telemetry and incidents
- bridge/channel runtime

But those capabilities are fragmented. Users cannot yet say:

- "When this happens, do that"
- "Use this file or script when it triggers"
- "Show me what happened and why"
- "Turn this one-off fix into a reusable automation"

The product line should solve that fragmentation.

The end-state is not "hooks support". The end-state is:

**a unified automation system where triggers, actions, logs, and self-contained packages all feel like one product.**

## Product Family

The full line should be organized under `Automation`, with five durable sub-products:

1. `Reminders`
   Lightweight personal nudges driven by time.
2. `Scheduled Tasks`
   Time-based agent runs and recurring jobs.
3. `Event Tasks`
   Event-driven rules, the user-facing form of hooks.
4. `Workflows`
   Multi-step automations chaining triggers, conditions, and actions.
5. `Control Plane`
   Event center, history, diagnostics, governance, and recovery.

These should not feel like separate apps. They should feel like escalating levels of automation power.

## Naming

Use these naming rules consistently:

- Internal engineering term: `hook`
- Product term: `event task`
- Advanced technical concept: `trigger`
- User-facing complex unit: `automation package`

Why:

- `hook` is correct for engineers but intimidating for most users.
- `event task` is understandable: a task triggered by an event.
- `package` explains the self-contained directory model better than "resource bundle" or "artifact set".

## Core Objects

The product should be built around six product objects:

### 1. Event

A fact that the system observed.

Examples:

- `thread.started`
- `thread.finished`
- `thread.failed`
- `clarification.requested`
- `permission.requested`
- `automation.run.started`
- `automation.run.succeeded`
- `automation.run.failed`

### 2. Trigger

The condition that starts automation.

Trigger types:

- `schedule`
- `event`
- `webhook`
- `manual`

### 3. Rule

A durable automation definition.

Examples:

- reminder
- scheduled task
- event task
- future workflow node chain

### 4. Action

What the rule does when triggered.

Actions evolve in layers:

- notify
- play sound
- write notebook entry
- create thread
- send bridge/channel message
- run agent
- run script
- invoke workflow

### 5. Package

A self-contained working directory for one event task or workflow.

This is the concrete embodiment of the user's "hook folder" preference.

Rules:

- every event task may have one package
- packages are local to one rule
- packages are not globally managed resources
- deletion of the rule deletes the package

### 6. Run

One execution instance of a rule.

It needs:

- trigger source
- execution timestamps
- status
- summary
- logs
- related event id
- output references

## User Mental Model

The user should think:

- "Nion noticed something"
- "I can teach Nion what to do when that happens"
- "Simple cases are templates"
- "Complex cases can include files and scripts"
- "Every complex event task is its own little package"
- "I can test it, inspect it, and remove it cleanly"

The user should not think:

- "I am registering low-level lifecycle callbacks"
- "I am managing a global script asset registry"
- "I must understand internal runtime routing to configure this"

## Product Structure

The Automation navigation should grow into:

```text
Automation
├── Overview
├── Reminders
├── Scheduled Tasks
├── Event Tasks
├── Workflows
├── Event Center
├── Run History
├── Template Library
└── Governance
```

### Overview

The health dashboard for all automation.

### Reminders

The shallowest, fastest path for personal recurring prompts.

### Scheduled Tasks

Time-driven jobs running agent prompts or other repeatable actions.

### Event Tasks

The heart of the hook system.

This should support:

- built-in templates
- natural language creation
- self-contained package directories
- test runs
- recent logs

### Workflows

The future layer above event tasks.

This turns "one trigger -> one action" into "one trigger -> many coordinated actions".

### Event Center

A read-first view of what happened across the system.

This is how users learn what is worth automating next.

### Run History

A unified execution ledger across reminders, scheduled tasks, event tasks, and workflows.

### Template Library

The growth layer. Good automations become reusable patterns.

### Governance

The trust layer for policies, directories, package behavior, permissions, and eventual team controls.

## Entry Strategy

The product line should have two creation paths from day one:

### 1. Template-first path

For simple, common tasks:

- reply finished reminder
- intervention required alert
- automation failed alert
- keyword archive

This path optimizes for speed.

### 2. Chat-first path

For complex tasks with files, logic, conditions, or scripts.

This path optimizes for expressiveness.

The chat flow should not silently create rules. It should produce a human-readable draft card summarizing:

- name
- trigger
- conditions
- action
- package directory
- files to be created

The user confirms, then the system saves the rule and package.

## Package Model

This product line should intentionally choose simplicity over global resource management.

Each event task package lives at a fixed directory:

`{base_dir}/automation/hooks/{hook_id}/`

Guiding rules:

- no global asset library
- no cross-task file sharing as a first-class behavior
- no resource reference graph
- no orphan cleanup system beyond rule deletion

If a rule needs files, it gets a package directory.
If it does not need files, no directory is created.
If the rule is deleted, the package directory is deleted with it.

This makes the product legible:

- one rule
- one package
- one deletion boundary

## Action Progression

The action line should mature in this order:

### Layer 1: Built-in actions

- desktop notification
- built-in sound
- notebook write
- thread message write

### Layer 2: Package-backed actions

- run local script
- use uploaded mp3
- use packaged template file

### Layer 3: Agent-backed actions

- create thread
- summarize event
- continue failed work
- ask user for confirmation

### Layer 4: Workflow actions

- branch
- delay
- retry
- escalate

## Event Catalog

The product should support a stable event catalog, even if implementation rolls out gradually.

### Chat and Agent

- `thread.started`
- `thread.finished`
- `thread.failed`
- `agent.run.started`
- `agent.run.completed`
- `agent.run.failed`

### Human Intervention

- `clarification.requested`
- `permission.requested`
- `permission.resolved`

### Automation

- `automation.run.started`
- `automation.run.succeeded`
- `automation.run.failed`

### Bridge / Channel

- `bridge.message.received`
- `bridge.delivery.failed`

### Diagnostics

- `incident.created`
- `incident.escalated`

## Key User Scenarios

This product line should fully embrace these scenarios:

1. Play a custom sound when a chat reply finishes.
2. Notify the user when the system asks for clarification.
3. Alert on automation failure with retry and inspect options.
4. Archive messages that match a finance keyword list.
5. Escalate selected bridge messages into high-priority threads.
6. Turn an observed event into a reusable rule from the event center.
7. Package a working automation and share it as a template later.

## Product Principles

### 1. Explain before abstracting

Users should see readable trigger/action summaries before advanced fields.

### 2. Complex power should feel packaged

If a task has files or scripts, it should feel like a discrete working package.

### 3. Every automation should be testable

Rules without test and history surfaces become superstition.

### 4. Events should teach the product

The event center is not just diagnostics. It is the discovery engine for future automation.

### 5. Trust beats cleverness

Deletion boundaries, package ownership, and logs should be obvious.

## Expansion Path

This line should expand in these waves:

### Wave 1

Event tasks exist as a first-class module.

### Wave 2

Event center and event-to-rule creation.

### Wave 3

Workflow composition and multi-step actions.

### Wave 4

Template packaging and import/export.

### Wave 5

Team governance and enterprise controls.

### Wave 6

Open automation platform with third-party triggers and actions.

## Final Product Statement

Nion should evolve from a chat assistant with automation fragments into:

**an automation operating system where time, system events, failures, and human collaboration moments can all trigger durable, observable, user-controlled action.**
