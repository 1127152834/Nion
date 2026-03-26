# Local Runtime Program 03B: Execution Telemetry Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the daemon control plane so delegated task and subagent execution events are queryable, diagnosable, and readable by both humans and agents.

**Architecture:** Reuse the existing SQLite-backed telemetry store and daemon control-plane APIs. Standardize delegated task correlation on the existing `run_id` field, add task-scoped diagnostic snapshots, instrument `task_tool` and `SubagentExecutor`, then expose task diagnostics through the daemon API and built-in control-plane tools.

**Tech Stack:** Python 3.12, FastAPI, SQLite, LangChain tools, LangGraph agent runtime, pytest, ruff

---

## Pre-Read

Read these before changing code:

- Program 03 baseline design:
  - `docs/plans/2026-03-26-local-runtime-program-03-daemon-control-plane-design.md`
- Program 03B execution telemetry design:
  - `docs/plans/2026-03-26-local-runtime-program-03b-execution-telemetry-design.md`
- Existing telemetry substrate:
  - `backend/packages/harness/nion/telemetry/models.py`
  - `backend/packages/harness/nion/telemetry/store.py`
  - `backend/packages/harness/nion/telemetry/logger.py`
- Existing daemon query surfaces:
  - `backend/app/daemon/routers/logs.py`
  - `backend/app/daemon/routers/diagnostics.py`
- Execution path to instrument:
  - `backend/packages/harness/nion/tools/builtins/task_tool.py`
  - `backend/packages/harness/nion/subagents/executor.py`
- Existing control-plane tool layer:
  - `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
  - `backend/packages/harness/nion/tools/tools.py`

Constraints to preserve:

- Do not create a second event database.
- Keep `message` human-readable and bounded.
- Do not dump full delegated prompts or full AI messages into telemetry.
- Reuse `run_id` as the delegated task identifier.
- Keep the first cut scoped to delegated execution, not channel telemetry.
- Agent tools must consume control-plane APIs/data, not scrape files or raw SQLite directly beyond the existing built-in telemetry access pattern.

## Task 1: Extend Telemetry Querying for Delegated Task Correlation

**Files:**
- Modify: `backend/packages/harness/nion/telemetry/store.py`
- Modify: `backend/packages/harness/nion/telemetry/models.py`
- Modify: `backend/app/daemon/routers/logs.py`
- Create: `backend/tests/test_execution_event_store.py`
- Modify: `backend/tests/test_daemon_logs_api.py`

**Step 1: Write the failing store and API tests**

Create `backend/tests/test_execution_event_store.py`:

```python
from nion.telemetry.models import EventRecord
from nion.telemetry.store import TelemetryStore


def test_event_store_filters_by_run_id(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-1",
            category="tool",
            level="info",
            event_type="task_delegation_requested",
            actor="agent",
            run_id="task-1",
            tool_name="task",
            message="Delegated task requested",
            details={},
        )
    )
    store.record_event(
        EventRecord(
            event_id="evt-2",
            category="tool",
            level="error",
            event_type="task_delegation_failed",
            actor="agent",
            run_id="task-2",
            tool_name="task",
            message="Delegated task failed",
            details={},
        )
    )

    events = store.list_events(limit=10, run_id="task-2")

    assert len(events) == 1
    assert events[0].run_id == "task-2"
    assert events[0].event_type == "task_delegation_failed"
```

Extend `backend/tests/test_daemon_logs_api.py` with a test that `GET /api/daemon/logs?run_id=task-123` returns only matching events.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_execution_event_store.py tests/test_daemon_logs_api.py -q
```

Expected: `FAIL` because `list_events()` and the daemon logs route do not support `run_id`

**Step 3: Implement delegated task filtering**

Update `TelemetryStore.list_events()` to accept `run_id`.

Update the daemon logs API to accept and pass through:

- `run_id`

Keep the response shape unchanged.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_execution_event_store.py tests/test_daemon_logs_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/telemetry/store.py backend/packages/harness/nion/telemetry/models.py backend/app/daemon/routers/logs.py backend/tests/test_execution_event_store.py backend/tests/test_daemon_logs_api.py
git commit -F - <<'EOF'
Make delegated task events queryable through the daemon control plane

Constraint: Program 03B must correlate execution telemetry without introducing a second event store or a breaking schema split
Rejected: Add a dedicated task-events table | the existing event_log already has the right shape and only needs better filtering
Confidence: high
Scope-risk: narrow
Directive: Keep delegated task correlation on run_id unless a broader execution identity model is introduced everywhere
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_execution_event_store.py tests/test_daemon_logs_api.py -q
Not-tested: Query behavior on very large event volumes
EOF
```

## Task 2: Instrument `task_tool` with Delegation Telemetry and Task Snapshots

**Files:**
- Modify: `backend/packages/harness/nion/tools/builtins/task_tool.py`
- Modify: `backend/packages/harness/nion/telemetry/store.py`
- Create: `backend/tests/test_task_tool_telemetry.py`

**Step 1: Write the failing task-tool telemetry test**

Create `backend/tests/test_task_tool_telemetry.py`:

```python
from nion.telemetry.store import TelemetryStore


def test_task_tool_records_delegation_failure(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    from nion.tools.builtins.task_tool import _record_task_failure

    _record_task_failure(
        task_id="task-1",
        thread_id="thread-1",
        description="inspect logs",
        subagent_type="general-purpose",
        trace_id="trace-1",
        error="Task disappeared from background tasks",
    )

    store = TelemetryStore(paths_module.get_paths().telemetry_db_file)
    events = store.list_events(limit=10, run_id="task-1")
    snapshot = store.get_snapshot("task", "task-1")

    assert events[0].event_type == "task_delegation_failed"
    assert snapshot.status == "error"
    assert snapshot.details["description"] == "inspect logs"
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_task_tool_telemetry.py -q
```

Expected: `FAIL` because `task_tool.py` has no structured telemetry helpers yet

**Step 3: Implement task-tool telemetry**

Add small internal helpers in `task_tool.py` that:

- record delegation lifecycle events with `category="tool"` and `tool_name="task"`
- use `run_id=task_id`
- upsert `scope_type="task"` snapshots as state changes occur

Record at least:

- `task_delegation_requested`
- `task_delegation_started`
- `task_delegation_running`
- `task_delegation_completed`
- `task_delegation_failed`
- `task_delegation_timed_out`

Snapshot details should include:

- `task_id`
- `thread_id`
- `description`
- `subagent_type`
- `trace_id`
- `status`
- `poll_count`
- `ai_message_count`
- `error`

Do not record the full delegated prompt. At most, store `description` and bounded metadata.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_task_tool_telemetry.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/builtins/task_tool.py backend/tests/test_task_tool_telemetry.py
git commit -F - <<'EOF'
Record delegated task lifecycle events and snapshots in the control plane

Constraint: Delegated execution needs a task-level diagnostic view without storing full prompts or oversized payloads
Rejected: Log only final task outcomes | that would hide hangs, disappearances, and intermediate running state
Confidence: high
Scope-risk: moderate
Directive: Keep task snapshot summaries operator-readable and keep detailed execution context in structured fields only
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_task_tool_telemetry.py -q
Not-tested: High-frequency delegated tasks contending on the telemetry SQLite file
EOF
```

## Task 3: Instrument `SubagentExecutor` Lifecycle

**Files:**
- Modify: `backend/packages/harness/nion/subagents/executor.py`
- Create: `backend/tests/test_subagent_executor_telemetry.py`

**Step 1: Write the failing subagent telemetry test**

Create `backend/tests/test_subagent_executor_telemetry.py`:

```python
from nion.telemetry.store import TelemetryStore


def test_subagent_executor_records_timeout_event(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    from nion.subagents.executor import _record_subagent_timeout

    _record_subagent_timeout(
        task_id="task-timeout",
        thread_id="thread-1",
        subagent_name="general-purpose",
        trace_id="trace-1",
        timeout_seconds=300,
    )

    store = TelemetryStore(paths_module.get_paths().telemetry_db_file)
    events = store.list_events(limit=10, run_id="task-timeout", category="agent")

    assert events[0].event_type == "subagent_execution_timed_out"
    assert "timed out" in events[0].message
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_subagent_executor_telemetry.py -q
```

Expected: `FAIL` because `SubagentExecutor` only writes ordinary logger output today

**Step 3: Implement subagent lifecycle telemetry**

Instrument `SubagentExecutor` to record:

- `subagent_executor_initialized`
- `subagent_execution_started`
- `subagent_ai_message_captured`
- `subagent_execution_completed`
- `subagent_execution_failed`
- `subagent_execution_timed_out`

Rules:

- `category="agent"`
- `run_id=task_id`
- include `thread_id` when known
- include `details.trace_id`
- include bounded `last_message_excerpt` or message count, not full message bodies
- compute and store `duration_ms` where available

When subagent execution reaches a terminal state, upsert the `task` snapshot with the latest status and summary.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_subagent_executor_telemetry.py tests/test_task_tool_telemetry.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/subagents/executor.py backend/tests/test_subagent_executor_telemetry.py
git commit -F - <<'EOF'
Expose subagent lifecycle telemetry to the daemon control plane

Constraint: Agents need visibility into delegated execution failures without depending on raw text logs
Rejected: Attribute all delegated failures only to the parent task_tool layer | that would hide whether the subagent never started, failed mid-run, or timed out
Confidence: high
Scope-risk: moderate
Directive: Keep subagent event names stable because future control-plane summaries will depend on them
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_subagent_executor_telemetry.py tests/test_task_tool_telemetry.py -q
Not-tested: Cross-thread race behavior under many concurrent subagent runs
EOF
```

## Task 4: Expose Task Diagnostics Through Daemon APIs and Control-Plane Tools

**Files:**
- Modify: `backend/app/daemon/routers/diagnostics.py`
- Modify: `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Modify: `backend/tests/test_daemon_diagnostics_api.py`
- Modify: `backend/tests/test_control_plane_tools.py`

**Step 1: Write the failing diagnostics and tool tests**

Extend `backend/tests/test_daemon_diagnostics_api.py` with:

```python
def test_daemon_task_diagnostics_returns_task_snapshot() -> None:
    ...
```

Extend `backend/tests/test_control_plane_tools.py` with:

```python
def test_get_task_diagnostics_tool_returns_snapshot() -> None:
    ...
```

The tests should create a `scope_type="task"` snapshot and assert both the daemon API and the tool can read it.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py -q
```

Expected: `FAIL` because there is no task diagnostics route or built-in tool

**Step 3: Implement task diagnostics surfaces**

Add:

- `GET /api/daemon/diagnostics/tasks/{task_id}`
- `get_task_diagnostics(task_id)`

Extend `get_recent_logs(...)` to accept `run_id`.

The daemon fallback behavior should be:

- if task snapshot exists, return it
- else if events for `run_id=task_id` exist, summarize from the latest event
- else return a healthy “not found” style diagnostic

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py tests/test_daemon_logs_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/daemon/routers/diagnostics.py backend/packages/harness/nion/tools/builtins/control_plane_tools.py backend/packages/harness/nion/tools/builtins/__init__.py backend/packages/harness/nion/tools/tools.py backend/tests/test_daemon_diagnostics_api.py backend/tests/test_control_plane_tools.py backend/tests/test_daemon_logs_api.py
git commit -F - <<'EOF'
Expose delegated task diagnostics to daemon APIs and agent tools

Constraint: The agent must be able to diagnose delegated execution from the control plane without scraping raw logs manually
Rejected: Reuse only thread diagnostics for delegated execution | thread-level summaries are too coarse to explain which delegated task failed
Confidence: high
Scope-risk: narrow
Directive: Keep task diagnostics read-only in this phase; self-remediation belongs to a later plan
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py tests/test_daemon_logs_api.py -q
Not-tested: Live daemon API behavior during a currently-running delegated task
EOF
```

## Task 5: Lock Coverage Expectations and Update Docs

**Files:**
- Modify: `backend/tests/test_control_plane_logging_coverage.py`
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/desktop/development.md`

**Step 1: Add the failing coverage expectation test**

Extend `backend/tests/test_control_plane_logging_coverage.py` so it explicitly checks the codebase references delegated execution telemetry expectations:

- delegated task lifecycle
- subagent execution lifecycle
- task diagnostics

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_control_plane_logging_coverage.py -q
```

Expected: `FAIL` until coverage expectations are updated

**Step 3: Update docs**

Document:

- delegated task telemetry now lives in the daemon control plane
- task diagnostics route/tool availability
- `run_id` is the task correlation key for delegated execution
- channel telemetry is still a planned next step

**Step 4: Run final verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_execution_event_store.py tests/test_task_tool_telemetry.py tests/test_subagent_executor_telemetry.py tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py tests/test_threads_router.py tests/test_skills_api.py tests/test_gateway_config_api.py tests/test_model_admin_router.py tests/test_local_daemon_api.py -q
uvx ruff check app/daemon app/gateway/routers packages/harness/nion tests/test_execution_event_store.py tests/test_task_tool_telemetry.py tests/test_subagent_executor_telemetry.py tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py
uv run python -m nion.cli.main daemon status
```

Expected:

- pytest: `PASS`
- ruff: `All checks passed!`
- CLI: returns JSON daemon runtime info

**Step 5: Commit**

```bash
git add backend/tests/test_control_plane_logging_coverage.py README.md backend/README.md backend/CLAUDE.md docs/desktop/development.md
git commit -F - <<'EOF'
Document delegated execution observability in the daemon control plane

Constraint: Program 03B needs its logging promises encoded in tests and docs so later changes do not silently drop observability
Rejected: Leave delegated execution coverage implicit in code only | future modifiers would not know which telemetry guarantees are intentional
Confidence: high
Scope-risk: narrow
Directive: Do not add channel telemetry expectations to this phase unless the code lands in the same change set
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_execution_event_store.py tests/test_task_tool_telemetry.py tests/test_subagent_executor_telemetry.py tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py tests/test_threads_router.py tests/test_skills_api.py tests/test_gateway_config_api.py tests/test_model_admin_router.py tests/test_local_daemon_api.py -q && uvx ruff check app/daemon app/gateway/routers packages/harness/nion tests/test_execution_event_store.py tests/test_task_tool_telemetry.py tests/test_subagent_executor_telemetry.py tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py && uv run python -m nion.cli.main daemon status
Not-tested: Phase 2 channel telemetry, Electron-side diagnostics UI consumption
EOF
```
