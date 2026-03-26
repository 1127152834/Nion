# Local Runtime Program 03: Daemon Control Plane for Agent Self-Operations Design

## Goal

Build a daemon-owned control plane that lets Nion inspect, explain, and selectively operate on itself. The control plane should give both humans and agents a structured way to answer questions like:

- Why did the system fail just now?
- What is currently running?
- What changed recently?
- What skills and configs exist?
- Can the system diagnose itself?
- Can the system make safe, traceable edits to its own non-core surfaces?

The primary outcome is not a user-facing CLI shell. The primary outcome is an agent-readable operational substrate.

## Product Decision

The interactive TUI line is no longer the main product direction.

The user-facing product remains:

- Electron as the primary surface

The control/operations surfaces become:

- daemon private APIs
- thin daemon CLI for operational commands
- agent tools that read and, under guardrails, modify daemon-managed surfaces

This means the control plane is the main object of design, and CLI is only one possible client of it.

## System Boundary

The control plane should be owned by the local daemon.

It should not depend on:

- Electron-specific state
- browser-only logic
- ad hoc shell scripts
- direct filesystem scraping by agents

It should unify three perspectives:

1. **Daemon runtime perspective**
   Process lifecycle, connected clients, health, configuration state, stop/restart conditions, recent failures.

2. **Agent activity perspective**
   Thread runs, model calls, tool calls, skill use, failures, retries, edits, and high-level outcomes.

3. **Operator/action perspective**
   Safe inspect-and-act operations on skills, config, and diagnostics.

## Core Idea: Logs and Diagnostics Are Different Layers

Program 03 should distinguish between:

- **event logs**
  Time-ordered facts about what happened
- **diagnostics**
  Interpreted current or recent state, optimized for answering “what is wrong?”

Logs answer:

- What happened?
- In what order?
- With which IDs and actors?

Diagnostics answer:

- What is currently unhealthy?
- What recently failed?
- Which failures matter most right now?
- What should the system or operator look at next?

This separation matters because agents should not have to parse raw logs for every self-inspection question.

## Event Model

The first version should use a single structured event schema across daemon and agent activity.

Required fields:

- `event_id`
- `timestamp`
- `category`
  - `daemon`
  - `client`
  - `thread`
  - `agent`
  - `model`
  - `tool`
  - `skill`
  - `config`
  - `diagnostic`
- `level`
  - `info`
  - `warning`
  - `error`
- `event_type`
  - examples:
    - `daemon_started`
    - `daemon_shutdown_requested`
    - `client_registered`
    - `thread_stream_started`
    - `thread_stream_failed`
    - `tool_call_completed`
    - `skill_updated`
    - `config_updated`
- `thread_id`
- `client_id`
- `actor`
  - `electron`
  - `cli`
  - `agent`
  - `system`
- `message`
- `details`
  structured JSON payload

Optional but valuable:

- `run_id`
- `tool_name`
- `skill_name`
- `config_path`
- `error_code`
- `duration_ms`

The schema should be stable enough that:

- daemon APIs can filter on it
- agent tools can query it
- future Electron diagnostics pages can render it
- future CLI commands can tail or summarize it

## Storage Model

The first version should store logs and diagnostics in local SQLite, not plain text files.

Reasons:

- the agent needs structured querying, not grep-only access
- logs need filtering by category, level, thread, and time
- diagnostics need aggregation
- a single local embedded database fits the desktop single-user model

Recommended tables:

### `event_log`

Append-only event table.

Columns:

- `id`
- `event_id`
- `timestamp`
- `category`
- `level`
- `event_type`
- `thread_id`
- `client_id`
- `run_id`
- `actor`
- `message`
- `details_json`

### `diagnostic_snapshots`

Latest summarized state for key entities.

Columns:

- `id`
- `scope_type`
  - `daemon`
  - `thread`
  - `skill`
  - `config`
- `scope_id`
- `status`
  - `healthy`
  - `degraded`
  - `error`
- `summary`
- `details_json`
- `updated_at`

### Optional later

- `event_tags`
- `retention_markers`
- `operator_actions`

Not required in the first cut.

## Retention Strategy

Keep the first version simple and predictable.

- retain recent events by time and count
  - for example: 30 days and/or 50,000 rows
- keep diagnostics as rolling latest snapshots
- optionally preserve error events longer than info events

Do not build archival tiers, compression, or remote export yet.

## Query and Control APIs

The daemon should expose a private control-plane surface under `/api/daemon`.

Recommended first-version read APIs:

- `GET /api/daemon/status`
  Unified runtime summary
- `GET /api/daemon/logs`
  Filterable event stream
- `GET /api/daemon/logs/tail`
  Recent event tail
- `GET /api/daemon/diagnostics`
  Daemon-level diagnostic summary
- `GET /api/daemon/diagnostics/threads/{thread_id}`
  Thread-level diagnostic summary
- `GET /api/daemon/diagnostics/skills/{skill_name}`
  Skill-level diagnostic summary
- `GET /api/daemon/skills`
  Skill inventory optimized for operations
- `GET /api/daemon/skills/{skill_name}`
  Read one skill
- `GET /api/daemon/config`
  Read current daemon-relevant config summary

Recommended first-version action APIs:

- `POST /api/daemon/doctor`
  Run a structured self-check
- `POST /api/daemon/skills/{skill_name}/update`
  Update a custom skill
- `POST /api/daemon/skills/install`
  Install a custom skill
- `POST /api/daemon/config/update`
  Update allowed config scopes

The action APIs must be narrower and more guarded than the read APIs.

## Agent Tools

Program 03 should give the agent tools, not raw database access.

### Read-only tools

- `get_runtime_status`
- `get_recent_logs`
- `get_thread_diagnostics`
- `get_skill_diagnostics`
- `list_skills`
- `read_skill`
- `get_config_summary`
- `run_doctor`

These should be broadly available because they are observational.

### Controlled mutation tools

- `update_skill`
- `install_skill`
- `update_config`
- `restart_daemon` or `request_daemon_restart` only if needed later

These should be restricted by policy from day one.

## Guardrails for Self-Modification

The agent should not be allowed to rewrite arbitrary internals.

First-version guardrails:

- allow mutation only in explicitly permitted surfaces
  - custom skills
  - approved daemon config sections
- disallow mutation of:
  - core runtime code
  - built-in skills
  - daemon process code
  - arbitrary package files
- require all mutations to produce:
  - an event log entry
  - before/after summary
  - actor = `agent`
  - result status

Optional later:

- human approval for high-risk actions
- staged changes
- rollback records

## Logging What Matters

The first version should log these events at minimum:

### Daemon events

- daemon start
- daemon stop requested
- daemon stop completed
- config refresh
- health degradation
- client register / unregister

### Thread and agent events

- thread stream start
- thread stream finish
- thread stream error
- model call summary
- tool call summary
- skill insertion and skill execution summary

### Self-operation events

- skill read
- skill update attempted
- skill update applied
- config read
- config update attempted
- config update applied
- doctor run started / finished

This is enough for both human diagnosis and agent-readable self-inspection.

## Diagnostics Model

Diagnostics should not just replay logs. They should summarize them.

Example daemon diagnostic summary:

- daemon healthy or degraded
- client counts
- last startup time
- last config reload
- most recent error event
- most recent failed thread

Example thread diagnostic summary:

- last run time
- last run success/failure
- last error message
- tools called in most recent run
- model used

Example skill diagnostic summary:

- last time used
- last failure involving that skill
- whether currently enabled

These summaries should be cached or materialized in `diagnostic_snapshots` so the agent can answer “what is wrong?” quickly.

## Human and Agent Clients

The same control plane should support:

1. Agent tools
2. thin CLI commands
3. later Electron diagnostics pages

The order of importance is:

1. agent tools
2. daemon APIs
3. thin CLI
4. Electron visualization

The control plane should therefore optimize for machine-readable structure first, human presentation second.

## Logging Output vs. Stored Events

It is still fine to keep human-readable process logs for local debugging and script-based startup.

But those file logs should be treated as secondary mirrors, not the primary operational substrate.

Primary substrate:

- structured event log in SQLite

Secondary aids:

- stdout/stderr process logs
- `logs/*.log` files from dev scripts

## Recommended Delivery Order for Program 03

### Step 1

Create the event model and SQLite store.

### Step 2

Instrument daemon lifecycle and client events.

### Step 3

Instrument thread, model, tool, and skill summary events.

### Step 4

Expose read-only daemon logs and diagnostics APIs.

### Step 5

Add agent read-only self-inspection tools.

### Step 6

Add carefully scoped mutation tools for custom skills and selected config.

## Success Criteria

Program 03 succeeds when:

- the daemon records structured events for runtime and agent behavior
- the daemon exposes read APIs for logs and diagnostics
- the agent can explain recent failures by querying those tools
- the agent can read and modify approved self-surfaces in a traceable way
- every self-operation is itself logged

## Recommended Next Step

Write the implementation plan as:

- structured event store
- daemon lifecycle instrumentation
- agent/thread/tool/skill instrumentation
- diagnostics APIs
- agent self-inspection tools
- guarded mutation tools

Recommended filename:

- `docs/plans/2026-03-26-local-runtime-program-03-daemon-control-plane.md`
