# Local Runtime Program 03B: Execution Telemetry Expansion Design

## Goal

Extend Program 03 so the daemon control plane can explain delegated execution, not just daemon lifecycle and top-level thread/config/skill activity.

After this phase, Nion should be able to answer questions like:

- Which delegated task just failed?
- Which subagent timed out?
- How long did that delegated run take?
- Did the task ever start running, or did it disappear before execution?
- What is the latest diagnostic status for a specific delegated task?

The primary target is not a user-facing TUI. The target is better self-inspection for the agent and better operator debugging for the desktop runtime.

## Product Decision

This phase should prioritize the execution path that matters most to self-operation:

1. `task_tool`
2. `SubagentExecutor`

Channel telemetry is important, but it is a second-phase expansion. If we mix both scopes now, we will increase risk and blur the answer to the most common failure question: “which delegated task or subagent just broke?”

So Program 03B should be split into:

- **Phase 1**
  execution telemetry for task delegation and subagent execution
- **Phase 2**
  channel lifecycle and message-bus telemetry

This document designs both, but only Phase 1 should be implemented immediately.

## Why Execution First

The current control plane already covers daemon lifecycle, thread stream outcomes, skill/config mutations, and model-admin operations. But the most agent-specific blind spot is still delegated execution.

Today, `task_tool` and `SubagentExecutor` emit ordinary logger text such as:

- task started
- task status changed
- task timed out
- subagent captured AI message

Those facts do not enter `telemetry.sqlite3`, so the daemon cannot summarize them through its control plane. That means an agent can see a thread-level failure but cannot reliably explain:

- whether the failure came from delegation
- which delegated task ID was involved
- whether the failure was timeout vs execution exception
- whether partial subagent output was produced before failure

Execution telemetry closes the highest-value observability gap while keeping the diff contained to harness and daemon control-plane files.

## Scope

### Phase 1: In Scope

- `backend/packages/harness/nion/tools/builtins/task_tool.py`
- `backend/packages/harness/nion/subagents/executor.py`
- daemon log filtering by delegated task/run ID
- daemon diagnostics route for one delegated task
- agent-facing control-plane tool for task diagnostics
- coverage tests for task/subagent telemetry

### Phase 1: Out of Scope

- channel lifecycle telemetry
- inbound/outbound IM message telemetry
- full prompt/body archival for delegated tasks
- Electron diagnostics UI
- retry orchestration or auto-remediation logic

### Phase 2: Planned Next

- `app/channels/service.py`
- `app/channels/message_bus.py`
- channel-specific diagnostics snapshots
- agent-facing channel diagnostics tools

## Data Model Decision

Program 03B should avoid adding a separate “task event store” or a second database. It should extend the existing event and diagnostics model.

### Event Correlation

Use the existing `run_id` field as the delegated task identifier.

Rules:

- `run_id` = delegated task ID returned by `task_tool` / `SubagentExecutor`
- `thread_id` = owning Nion thread, when known
- `tool_name = "task"` for task-tool lifecycle events
- `category = "tool"` for task-tool orchestration events
- `category = "agent"` for subagent executor lifecycle events
- `details.trace_id` = distributed trace ID linking parent and delegated execution

This preserves the current schema and only requires query/filter expansion, not a disruptive storage redesign.

### New Diagnostic Scope

Add `scope_type = "task"` for delegated execution snapshots.

`scope_id` should be the delegated task ID. Snapshot details should stay compact and human-readable:

- `task_id`
- `thread_id`
- `subagent_name`
- `subagent_type`
- `description`
- `status`
- `timeout_seconds`
- `started_at`
- `completed_at`
- `duration_ms`
- `ai_message_count`
- `last_message_excerpt`
- `error`
- `trace_id`

The snapshot summary should read like operator language, for example:

- `Delegated task 'search docs' is running`
- `Delegated task 'edit skill file' timed out after 300s`
- `Delegated task 'inspect logs' completed successfully`

## Logging Rules

Logs must stay human-readable in `message` and machine-parseable in `details`.

### What to Record

For `task_tool`:

- delegation requested
- background task registered
- status transition observed
- streaming subagent message emitted
- completed
- failed
- timed out
- disappeared from background task registry

For `SubagentExecutor`:

- executor initialized
- execution started
- AI message captured
- final result materialized
- execution failed
- execution timed out

### What Not to Record

- full delegated prompt bodies
- full AI message payloads
- giant serialized LangGraph state

Instead, store:

- short `description`
- subagent type/name
- counts
- timing
- truncated message excerpts
- structured error strings

This keeps the control plane readable, bounded, and safe to summarize.

## API and Tooling Surface

### Daemon API Additions

Extend the existing daemon surfaces rather than creating a new namespace.

- `GET /api/daemon/logs?run_id=<task_id>`
- `GET /api/daemon/diagnostics/tasks/{task_id}`

This keeps all self-inspection under the existing control-plane routes.

### Agent Tool Additions

Add:

- `get_task_diagnostics(task_id)`

Extend:

- `get_recent_logs(...)` to support `run_id`

That gives the agent a minimal but complete self-debug path:

1. inspect recent logs
2. identify task ID
3. query task diagnostics

## Phase 2: Channel Telemetry Design

Once execution telemetry is in place, the next expansion should add channel lifecycle and message-flow observability.

Recommended events:

- `channel_service_started`
- `channel_started`
- `channel_start_failed`
- `channel_stopped`
- `channel_restart_requested`
- `channel_inbound_enqueued`
- `channel_outbound_dispatched`
- `channel_outbound_failed`

Recommended diagnostic scope:

- `scope_type = "channel"`
- `scope_id = <channel_name>`

Recommended future APIs/tools:

- `GET /api/daemon/diagnostics/channels/{channel_name}`
- `get_channel_diagnostics(channel_name)`

## Testing Strategy

Phase 1 should be test-driven and centered on observable facts:

- delegated task events are written to SQLite
- `run_id` filtering works
- task snapshots are upserted as status changes occur
- daemon diagnostics return the task summary
- control-plane tools can retrieve the task summary

This phase should not rely on Electron to validate correctness. Backend tests and daemon API tests are sufficient for first-pass proof.
