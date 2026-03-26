# Local Runtime Program 03: Daemon Control Plane for Agent Self-Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a daemon-owned control plane with structured event logging, diagnostics APIs, and agent-facing self-inspection/self-operation tools so Nion can explain, diagnose, and selectively modify itself without depending on a user-facing TUI.

**Architecture:** Add a single structured event system shared by daemon runtime and agent activity, store it in local SQLite, and materialize current-state diagnostic snapshots for daemon, thread, and skill scopes. Extend the daemon private API with readable status/log/diagnostic routes plus tightly scoped mutation routes for custom skills and approved config areas. Then expose a minimal agent tool layer on top of those APIs so the agent can answer “what happened?”, “what is broken?”, and “what can I safely change?” using machine-readable data instead of ad hoc log scraping.

**Tech Stack:** Python 3.12, FastAPI, SQLite, `logging`, `NionClient`, Pydantic, pytest

---

## Pre-Read

Read these before changing code:

- Program 03 design baseline:
  - `docs/plans/2026-03-26-local-runtime-program-03-daemon-control-plane-design.md`
- Existing daemon foundation:
  - `backend/app/daemon/app.py`
  - `backend/app/daemon/service.py`
  - `backend/app/daemon/routers/runtime.py`
  - `backend/app/daemon/routers/clients.py`
  - `backend/app/daemon/routers/control.py`
- Existing config/path/runtime surfaces:
  - `backend/packages/harness/nion/config/paths.py`
  - `backend/app/gateway/routers/config.py`
  - `backend/app/gateway/routers/skills.py`
  - `backend/app/gateway/routers/model_admin.py`
  - `backend/app/gateway/routers/threads.py`
- Existing logging-heavy modules that need instrumentation review:
  - `backend/packages/harness/nion/client.py`
  - `backend/packages/harness/nion/tools/builtins/task_tool.py`
  - `backend/app/channels/manager.py`
  - `backend/app/channels/service.py`
  - `backend/app/gateway/app.py`
- Reference telemetry work to mine for storage/query patterns:
  - `docs/plans/2026-03-24-hermes-usage-insights-2.md`

Relevant execution skills:

- `@superpowers:executing-plans`
- `@superpowers:verification-before-completion`
- `@superpowers:test-driven-development`
- `@superpowers:requesting-code-review`

Constraints to preserve throughout Program 03:

- Logs must be structured and queryable.
- Diagnostics must be human-readable summaries, not raw log dumps.
- The first version should support both daemon runtime and agent behavior events.
- Event storage should be SQLite-first, not plain-text-first.
- Agent tools should consume the control plane, not read the database directly.
- Mutation tools must be narrower and more guarded than read tools.
- Custom skills and approved config surfaces may be mutable; core runtime code is not.
- Prefer deletion or reuse over new abstraction layers.

## Task 1: Create the Structured Event Store and Diagnostic Snapshot Store

**Files:**
- Create: `backend/packages/harness/nion/telemetry/__init__.py`
- Create: `backend/packages/harness/nion/telemetry/models.py`
- Create: `backend/packages/harness/nion/telemetry/store.py`
- Modify: `backend/packages/harness/nion/config/paths.py`
- Create: `backend/tests/test_event_store.py`
- Create: `backend/tests/test_diagnostic_snapshot_store.py`

**Step 1: Write the failing store tests**

Create `backend/tests/test_event_store.py`:

```python
from nion.telemetry.models import EventRecord
from nion.telemetry.store import TelemetryStore


def test_event_store_records_and_filters_structured_events(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_event(
        EventRecord(
            event_id="evt-1",
            category="daemon",
            level="info",
            event_type="daemon_started",
            actor="system",
            message="Daemon started",
            details={},
        )
    )
    store.record_event(
        EventRecord(
            event_id="evt-2",
            category="thread",
            level="error",
            event_type="thread_stream_failed",
            actor="agent",
            thread_id="thread-1",
            message="Thread run failed",
            details={"reason": "tool failure"},
        )
    )

    recent = store.list_events(limit=10)
    errors = store.list_events(limit=10, level="error")

    assert len(recent) == 2
    assert len(errors) == 1
    assert errors[0].event_type == "thread_stream_failed"
```

Create `backend/tests/test_diagnostic_snapshot_store.py`:

```python
from nion.telemetry.models import DiagnosticSnapshot
from nion.telemetry.store import TelemetryStore


def test_snapshot_store_upserts_latest_scope_summary(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="daemon",
            scope_id="local",
            status="healthy",
            summary="Daemon is healthy",
            details={},
        )
    )
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="daemon",
            scope_id="local",
            status="error",
            summary="Last check failed",
            details={"reason": "config"},
        )
    )

    snapshot = store.get_snapshot("daemon", "local")

    assert snapshot.status == "error"
    assert snapshot.summary == "Last check failed"
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_event_store.py tests/test_diagnostic_snapshot_store.py -q
```

Expected: `FAIL` because `nion.telemetry` does not exist

**Step 3: Implement the event and snapshot stores**

Create `backend/packages/harness/nion/telemetry/models.py` with:

```python
from dataclasses import dataclass, field
from typing import Any, Literal


@dataclass(slots=True)
class EventRecord:
    event_id: str
    category: str
    level: Literal["info", "warning", "error"]
    event_type: str
    actor: str
    message: str
    details: dict[str, Any] = field(default_factory=dict)
    thread_id: str | None = None
    client_id: str | None = None
    run_id: str | None = None
    tool_name: str | None = None
    skill_name: str | None = None
    duration_ms: int | None = None
```

and:

```python
@dataclass(slots=True)
class DiagnosticSnapshot:
    scope_type: str
    scope_id: str
    status: Literal["healthy", "degraded", "error"]
    summary: str
    details: dict[str, Any] = field(default_factory=dict)
```

Create `backend/packages/harness/nion/telemetry/store.py` with:

- one SQLite database
- `event_log` table
- `diagnostic_snapshots` table
- `record_event()`
- `list_events()`
- `upsert_snapshot()`
- `get_snapshot()`

Modify `backend/packages/harness/nion/config/paths.py` to add:

```python
@property
def telemetry_db_file(self) -> Path:
    return self.base_dir / "telemetry.sqlite3"
```

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_event_store.py tests/test_diagnostic_snapshot_store.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/telemetry/__init__.py backend/packages/harness/nion/telemetry/models.py backend/packages/harness/nion/telemetry/store.py backend/packages/harness/nion/config/paths.py backend/tests/test_event_store.py backend/tests/test_diagnostic_snapshot_store.py
git commit -F - <<'EOF'
Create the structured event and diagnostic snapshot stores for the daemon control plane

Constraint: Program 03 needs structured, queryable local telemetry rather than plain-text-only logs
Rejected: Use rolling text files as the primary store | agents and diagnostics APIs need reliable filtering by category, level, scope, and time
Confidence: high
Scope-risk: moderate
Directive: Keep event storage append-only and snapshot storage latest-state only until retention policy is expanded
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_event_store.py tests/test_diagnostic_snapshot_store.py -q
Not-tested: Store growth and retention under sustained high event volume
EOF
```

---

## Task 2: Add Human-Readable Structured Logging Helpers and Instrument Daemon Lifecycle

**Files:**
- Create: `backend/packages/harness/nion/telemetry/logger.py`
- Modify: `backend/app/daemon/service.py`
- Modify: `backend/app/daemon/routers/clients.py`
- Modify: `backend/app/daemon/app.py`
- Create: `backend/tests/test_daemon_telemetry.py`

**Step 1: Write the failing daemon telemetry test**

Create `backend/tests/test_daemon_telemetry.py`:

```python
from nion.telemetry.store import TelemetryStore
from app.daemon.service import LocalDaemonService


def test_daemon_service_records_client_register_and_unregister(tmp_path) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    service = LocalDaemonService(
        host="127.0.0.1",
        port=43115,
        allow_background_running=False,
        shutdown_grace_period_seconds=3,
    )
    service.attach_telemetry_store(store)

    service.register_client("electron-1", "electron")
    service.unregister_client("electron-1")

    events = store.list_events(limit=10, category="client")
    assert [event.event_type for event in events] == [
        "client_unregistered",
        "client_registered",
    ]
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_telemetry.py -q
```

Expected: `FAIL` because the daemon service has no telemetry attachment

**Step 3: Implement telemetry helpers and daemon lifecycle logging**

Create `backend/packages/harness/nion/telemetry/logger.py`:

```python
import uuid
from nion.telemetry.models import EventRecord


def make_event(...): ...
```

The helper should:

- generate `event_id`
- stamp human-readable `message`
- preserve structured `details`

Modify `LocalDaemonService` to:

- own an optional telemetry store
- expose `attach_telemetry_store(store)`
- record:
  - `daemon_service_initialized`
  - `client_registered`
  - `client_unregistered`
  - `daemon_config_refreshed`
  - `daemon_shutdown_condition_met`

Messages must be human-readable, e.g.:

- `"Electron client registered"`
- `"Background running setting refreshed"`
- `"Shutdown condition met with no remaining clients"`

Modify `backend/app/daemon/app.py` so the store is attached at startup.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_telemetry.py tests/test_local_daemon_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/telemetry/logger.py backend/app/daemon/service.py backend/app/daemon/routers/clients.py backend/app/daemon/app.py backend/tests/test_daemon_telemetry.py
git commit -F - <<'EOF'
Instrument daemon lifecycle and client events with structured, human-readable telemetry

Constraint: Program 03 needs daemon events that both humans and agents can understand without raw log scraping
Rejected: Log daemon behavior only through ordinary logger.info text | that would lose queryability and make diagnostics much harder to summarize
Confidence: high
Scope-risk: moderate
Directive: Every daemon lifecycle event should emit both a stable event_type and a readable message
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_telemetry.py tests/test_local_daemon_api.py -q
Not-tested: Cross-process visibility of daemon events in a live Electron session
EOF
```

---

## Task 3: Instrument Thread, Agent, Tool, Skill, and Config Events

**Files:**
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/app/gateway/routers/skills.py`
- Modify: `backend/app/gateway/routers/config.py`
- Modify: `backend/app/gateway/routers/model_admin.py`
- Create: `backend/tests/test_thread_event_logging.py`
- Create: `backend/tests/test_skill_event_logging.py`
- Create: `backend/tests/test_config_event_logging.py`

**Step 1: Write the failing instrumentation tests**

Create `backend/tests/test_thread_event_logging.py`:

```python
from nion.telemetry.store import TelemetryStore
from app.daemon.service import LocalDaemonService


def test_thread_stream_failure_records_error_event(tmp_path, monkeypatch) -> None:
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    service = LocalDaemonService(
        host="127.0.0.1",
        port=43115,
        allow_background_running=False,
        shutdown_grace_period_seconds=3,
    )
    service.attach_telemetry_store(store)

    service.record_thread_event(
        event_type="thread_stream_failed",
        thread_id="thread-1",
        level="error",
        message="Thread stream failed",
        details={"reason": "upstream unavailable"},
    )

    events = store.list_events(limit=10, category="thread", level="error")
    assert events[0].thread_id == "thread-1"
    assert events[0].message == "Thread stream failed"
```

Create `backend/tests/test_skill_event_logging.py` to verify skill update/install actions create `category="skill"` events.

Create `backend/tests/test_config_event_logging.py` to verify config update creates `category="config"` events with readable summary.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_thread_event_logging.py tests/test_skill_event_logging.py tests/test_config_event_logging.py -q
```

Expected: `FAIL` because the service and routers do not emit structured events yet

**Step 3: Instrument the key modules**

Add helper methods to `LocalDaemonService`:

- `record_thread_event(...)`
- `record_skill_event(...)`
- `record_config_event(...)`
- `record_agent_event(...)`

Then instrument:

- `backend/app/gateway/routers/threads.py`
  - stream started
  - stream finished
  - stream failed
- `backend/packages/harness/nion/client.py`
  - agent created
  - run started / completed summary
  - model selection summary
- `backend/app/gateway/routers/skills.py`
  - skill read
  - skill update attempted / applied / failed
  - skill install attempted / applied / failed
- `backend/app/gateway/routers/config.py`
  - config read
  - config update attempted / applied / failed
- `backend/app/gateway/routers/model_admin.py`
  - provider/model mutation summaries

Keep the message text human-readable. Examples:

- `"Thread stream failed for thread-1"`
- `"Updated custom skill 'ask-claude'"`
- `"Config update rejected by validation"`

Do not dump giant payloads into `message`. Put rich context in `details_json`.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_thread_event_logging.py tests/test_skill_event_logging.py tests/test_config_event_logging.py tests/test_threads_router.py tests/test_skills_api.py tests/test_gateway_config_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/gateway/routers/threads.py backend/packages/harness/nion/client.py backend/app/gateway/routers/skills.py backend/app/gateway/routers/config.py backend/app/gateway/routers/model_admin.py backend/tests/test_thread_event_logging.py backend/tests/test_skill_event_logging.py backend/tests/test_config_event_logging.py
git commit -F - <<'EOF'
Instrument thread, agent, skill, and config events for the daemon control plane

Constraint: Program 03 needs complete enough event coverage that the agent can answer failure and self-operation questions from facts rather than guesswork
Rejected: Instrument only daemon lifecycle and defer the rest | that would leave the most important self-inspection questions unanswered
Confidence: high
Scope-risk: broad
Directive: Keep messages human-readable and keep rich machine context in details_json, not in free-form strings
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_thread_event_logging.py tests/test_skill_event_logging.py tests/test_config_event_logging.py tests/test_threads_router.py tests/test_skills_api.py tests/test_gateway_config_api.py -q
Not-tested: Coverage of every possible tool and subagent event path
EOF
```

---

## Task 4: Expose Daemon Logs and Diagnostics APIs

**Files:**
- Create: `backend/app/daemon/routers/logs.py`
- Create: `backend/app/daemon/routers/diagnostics.py`
- Modify: `backend/app/daemon/routers/__init__.py`
- Modify: `backend/app/daemon/app.py`
- Create: `backend/tests/test_daemon_logs_api.py`
- Create: `backend/tests/test_daemon_diagnostics_api.py`

**Step 1: Write the failing API tests**

Create `backend/tests/test_daemon_logs_api.py`:

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_daemon_logs_api_filters_by_category_and_level() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/logs", params={"category": "daemon", "level": "info", "limit": 20})
        assert response.status_code == 200
        payload = response.json()
        assert "events" in payload
```

Create `backend/tests/test_daemon_diagnostics_api.py`:

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_daemon_diagnostics_api_returns_daemon_summary() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/diagnostics")
        assert response.status_code == 200
        payload = response.json()
        assert "status" in payload
        assert "summary" in payload
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py -q
```

Expected: `FAIL` because these routes do not exist

**Step 3: Add logs and diagnostics routers**

Create `backend/app/daemon/routers/logs.py` with:

- `GET /api/daemon/logs`
- `GET /api/daemon/logs/tail`

Supported filters:

- `category`
- `level`
- `thread_id`
- `limit`

Create `backend/app/daemon/routers/diagnostics.py` with:

- `GET /api/daemon/diagnostics`
- `GET /api/daemon/diagnostics/threads/{thread_id}`
- `GET /api/daemon/diagnostics/skills/{skill_name}`

Return human-readable summaries plus structured details.

Mount both routers in `backend/app/daemon/app.py`.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_local_daemon_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/daemon/routers/logs.py backend/app/daemon/routers/diagnostics.py backend/app/daemon/routers/__init__.py backend/app/daemon/app.py backend/tests/test_daemon_logs_api.py backend/tests/test_daemon_diagnostics_api.py
git commit -F - <<'EOF'
Expose daemon logs and diagnostics APIs for humans and agents

Constraint: Program 03 needs one private API layer that both agents and thin CLI tools can query for recent events and summarized health
Rejected: Force agents to infer diagnostics by reading raw event tables directly | that would couple tools to storage internals and weaken the control-plane boundary
Confidence: high
Scope-risk: moderate
Directive: Keep daemon diagnostics summaries readable first and machine-parsable second; raw event detail should stay in the logs API
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_local_daemon_api.py -q
Not-tested: Operator UX for long event histories and very noisy failure scenarios
EOF
```

---

## Task 5: Add Agent-Facing Self-Inspection and Guarded Self-Operation Tools

**Files:**
- Create: `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Create: `backend/tests/test_control_plane_tools.py`

**Step 1: Write the failing tools test**

Create `backend/tests/test_control_plane_tools.py`:

```python
from nion.tools.builtins.control_plane_tools import get_runtime_status_tool


def test_runtime_status_tool_returns_control_plane_summary(monkeypatch):
    def fake_fetch():
        return {"status": "healthy", "summary": "Daemon healthy"}

    tool = get_runtime_status_tool(fake_fetch)
    result = tool.invoke({})

    assert "Daemon healthy" in result
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_control_plane_tools.py -q
```

Expected: `FAIL` because control plane tools do not exist

**Step 3: Implement tools**

Create `backend/packages/harness/nion/tools/builtins/control_plane_tools.py` with:

- `get_runtime_status`
- `get_recent_logs`
- `get_thread_diagnostics`
- `get_skill_diagnostics`
- `list_skills`
- `read_skill`
- `get_config_summary`
- `run_doctor`

Add guarded mutation tools:

- `update_skill`
- `install_skill`
- `update_config`

Guardrails:

- only custom skills are mutable
- only approved daemon/config scopes are mutable
- all mutation tool calls must emit telemetry events

Wire these tools into `backend/packages/harness/nion/tools/tools.py` under a dedicated control-plane group or explicit built-in list.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_control_plane_tools.py tests/test_tool_search.py tests/test_tool_policy_router.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/builtins/control_plane_tools.py backend/packages/harness/nion/tools/tools.py backend/tests/test_control_plane_tools.py
git commit -F - <<'EOF'
Add agent-facing control-plane tools for self-inspection and guarded self-operations

Constraint: Agents should consume the daemon control plane through tools, not through direct database or filesystem access
Rejected: Let the agent inspect internal storage directly | that would bypass guardrails and make behavior harder to reason about
Confidence: medium
Scope-risk: broad
Directive: Keep read tools broadly available, but keep mutation tools narrow, logged, and restricted to custom skills and approved config scopes
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_control_plane_tools.py tests/test_tool_search.py tests/test_tool_policy_router.py -q
Not-tested: Long-running autonomous repair loops using these tools in production
EOF
```

---

## Task 6: Audit Key Module Coverage and Document the Control Plane

**Files:**
- Create: `backend/tests/test_control_plane_logging_coverage.py`
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `docs/desktop/development.md`

**Step 1: Write the failing coverage test**

Create `backend/tests/test_control_plane_logging_coverage.py`:

```python
from pathlib import Path


def test_control_plane_coverage_notes_exist_for_key_modules() -> None:
    text = (Path(__file__).resolve().parents[2] / "docs" / "desktop" / "development.md").read_text(encoding="utf-8")
    assert "daemon lifecycle events" in text
    assert "thread stream events" in text
    assert "skill mutation events" in text
    assert "config mutation events" in text
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_control_plane_logging_coverage.py -q
```

Expected: `FAIL` because docs do not yet describe logging coverage expectations

**Step 3: Document the system and its coverage**

Update docs to describe:

- the event model
- the difference between logs and diagnostics
- the CLI management surface
- the agent-facing self-inspection tools
- the key modules expected to emit control-plane events:
  - daemon lifecycle
  - thread streams
  - skill mutation
  - config mutation
  - model/provider mutation

Make it explicit that log messages must remain human-readable and structured.

**Step 4: Run the full Program 03 verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_event_store.py tests/test_diagnostic_snapshot_store.py tests/test_daemon_telemetry.py tests/test_thread_event_logging.py tests/test_skill_event_logging.py tests/test_config_event_logging.py tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py -q
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run python -m nion.cli.main --help
uv run python -m nion.cli.main daemon status
```

Expected: all tests pass and CLI daemon commands still work

**Step 5: Commit**

```bash
git add backend/tests/test_control_plane_logging_coverage.py README.md backend/README.md docs/desktop/development.md
git commit -F - <<'EOF'
Document the daemon control plane and audit key logging coverage

Constraint: Program 03 must produce logs and diagnostics that humans can understand, not just machine-readable event rows
Rejected: Treat documentation as optional after instrumentation lands | without explicit coverage expectations, logging quality will drift immediately
Confidence: medium
Scope-risk: narrow
Directive: Keep control-plane logs structured, but require human-readable summaries for every significant daemon and self-operation event
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_event_store.py tests/test_diagnostic_snapshot_store.py tests/test_daemon_telemetry.py tests/test_thread_event_logging.py tests/test_skill_event_logging.py tests/test_config_event_logging.py tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py -q; cd backend && uv run python -m nion.cli.main --help && uv run python -m nion.cli.main daemon status
Not-tested: Human operator review of diagnostics quality under real-world production failures
EOF
```
