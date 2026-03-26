# Local Runtime Program 03D-C: Unified Incident Inbox Design

## Goal

Build a single desktop-facing Incident Inbox that unifies:

- daemon-owned incidents
- desktop bridge-owned incidents

into one coherent user experience for diagnosis, suggested actions, and historical troubleshooting.

This phase is not about adding more raw diagnostics. It is about turning the existing incident capabilities into a single product surface that users can understand and operate.

## Product Decision

Program 03D-C should prioritize a **unified Incident Inbox** over adding more playbooks or more autonomous repair behaviors.

Why:

- Program 03D-A already provides daemon-side incident workflows
- Program 03D-B already provides desktop bridge incident workflows
- users still lack one place to understand “what is broken now”

Without a unified inbox, the product remains technically powerful but operationally fragmented.

## Core Principle

Program 03D-C should unify **presentation and action flow**, not necessarily **ownership or storage**.

That means:

- daemon incidents remain stored in backend SQLite
- bridge incidents remain stored in desktop-owned bridge storage
- the desktop app presents them as one incident feed

This is the right compromise between product coherence and architecture correctness.

## Architecture Boundary

### What remains separate

- daemon incident ownership
- bridge incident ownership
- daemon incident persistence
- bridge incident persistence
- daemon incident playbooks
- bridge incident playbooks

### What becomes unified

- incident list surface
- incident detail surface
- dismiss action
- suggested action rendering
- confirmed action execution entrypoint

## Control Plane Shape

Program 03D-C should introduce a new desktop-main aggregation layer:

- **Incident Inbox Controller**

This controller is responsible for:

- reading daemon incidents from the backend daemon API
- reading bridge incidents from desktop bridge stores / IPC-ready controllers
- normalizing both into one shared inbox shape
- forwarding dismiss / run-action calls to the correct owner

The renderer should not aggregate incidents itself.

## Why Desktop Main Should Aggregate

Renderer aggregation looks simpler at first, but it creates the wrong long-term shape:

- the renderer must understand two different owners
- action dispatch logic spreads across UI code
- adding a third incident source later becomes painful

Desktop main is the correct aggregation point because it already owns:

- desktop bridge runtime
- daemon session and desktop runtime awareness
- IPC contract definition

So the renderer should see:

- one incident inbox IPC surface

## Unified Inbox View Model

### List Item

Every list row should normalize into:

- `inbox_id`
  format: `<source_kind>:<incident_id>`
- `source_kind`
  - `daemon`
  - `bridge`
- `incident_id`
- `incident_type`
- `severity`
- `status`
- `summary`
- `updated_at`
- `scope_label`
- `recommended_action_count`
- `has_executed_actions`

### Detail Model

When opened, the item should expose:

- `source_kind`
- `incident_id`
- `incident_type`
- `severity`
- `status`
- `summary`
- `user_visible_explanation`
- `root_cause_hypothesis`
- `confidence`
- `evidence`
- `recommended_actions`
- `executed_actions`
- `resolution_note`

The point is to preserve rich detail without forcing the list view to behave like a monitoring console.

## Sorting and Filtering

### Default Sort

Do not use a pure chronological feed.

Default ordering should be:

1. `open` incidents first
2. `error` before `warning`
3. latest `updated_at`

This makes the inbox feel like a work queue rather than a log viewer.

### First-Version Filters

Only expose:

- `status`
- `severity`
- `source_kind`
- optional `incident_type`

Avoid building a full operator-grade filter panel in v1.

## Status Model

Program 03D-C should treat the inbox as a user-facing triage surface, so status needs to stay simple.

### Supported statuses

- `open`
- `dismissed`
- `resolved` reserved but not emphasized

### First-version behavior

- users can dismiss incidents
- executed actions are shown separately
- incidents are not auto-resolved just because an action ran

This avoids lying to the user about whether the underlying issue is truly fixed.

## Suggested Actions

The inbox should not invent a third action model. It should display and route the existing suggested actions already stored on daemon or bridge incidents.

### Shared presentation rules

Each action should show:

- label
- reason
- risk level
- whether confirmation is required
- whether it is executable now

### Execution rule

All actions remain **confirm-before-run**.

Program 03D-C should never bypass the action policies already defined by:

- daemon incident tools / daemon control plane
- bridge `run-action` flow

## Action Dispatch

The desktop-main aggregation layer should route actions based on `source_kind`.

### Daemon incidents

Use daemon APIs:

- dismiss
- get incident
- list incidents
- run recommended tool-backed actions via daemon incident/control-plane surface

### Bridge incidents

Use bridge incident controller and `bridge:run-action`.

The renderer should never need to know the source-specific action transport.

## Renderer UI

### Primary surface

Add a dedicated **Incident Inbox** page or section in the desktop workbench.

### Layout

Use a three-column workflow:

1. incident list
2. incident detail
3. recommended actions / action history

Keep the design closer to an “inbox” or “triage queue” than a logs console.

### Important UX rule

Do not default-expand raw JSON evidence.

Technical evidence should be visible but secondary.

The primary experience should answer:

- what broke
- why it probably broke
- what I can do next

## Relation to Existing Screens

### Bridge page

The bridge page may continue to host bridge-specific operational controls, but incident history should move toward the unified inbox as the primary troubleshooting surface.

### Chat

Chat-triggered daemon incidents should still work. The inbox is not replacing chat; it is giving users a stable historical and action surface after diagnosis happens.

## IPC Surface

Program 03D-C should add a new inbox IPC contract in desktop main:

- `incident-inbox:list`
- `incident-inbox:get`
- `incident-inbox:dismiss`
- `incident-inbox:run-action`

### Why not renderer-side fan-out

Because the renderer should not know:

- how to fetch daemon incidents
- how to fetch bridge incidents
- how to dispatch daemon actions
- how to dispatch bridge actions

All of that should be hidden behind one desktop aggregation controller.

## First-Version Scope

### In Scope

- desktop-main incident inbox aggregation
- unified list and detail model
- dismiss and action dispatch routing
- first desktop UI for unified incident inbox
- docs and tests

### Out of Scope

- deduplicating daemon and bridge incidents into one canonical record
- automatic incident creation beyond current source systems
- auto-resolve semantics
- deep incident correlation across daemon and bridge
- bridge or daemon playbook expansion

## Testing Strategy

Program 03D-C should prove:

- daemon + bridge incidents normalize into one inbox model
- sorting and filtering are stable
- dismiss routes to correct source
- run-action routes to correct source
- renderer uses inbox IPC only
- UI renders list/detail/action flow correctly

## Future Path

After Program 03D-C, the next logical expansions are:

- auto-created incidents
- stronger resolved-state semantics
- cross-source correlation
- deeper bridge and daemon playbook coverage

But none of those should block the first unified inbox.
