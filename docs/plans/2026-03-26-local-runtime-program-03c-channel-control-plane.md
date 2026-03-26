# Local Runtime Program 03C: Channel Control Plane Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the daemon control plane so IM channels can be inspected and operated through daemon-owned APIs and agent-facing tools, with structured telemetry and bounded runtime actions.

**Architecture:** Reuse the existing SQLite-backed telemetry store, `ChannelService`, `ChannelRepository`, and daemon control-plane conventions. Make the daemon app own `ChannelService` lifecycle, instrument channel runtime and message-bus events, expose `/api/daemon/channels/*` read/control routes, then add agent-facing tools for bounded channel self-operations.

**Tech Stack:** Python 3.12, FastAPI, SQLite, existing channel runtime (`ChannelService`, `MessageBus`, `ChannelRepository`), LangChain tools, pytest, ruff

---

## Pre-Read

Read these before changing code:

- Program 03 baseline design:
  - `docs/plans/2026-03-26-local-runtime-program-03-daemon-control-plane-design.md`
- Program 03B execution telemetry design:
  - `docs/plans/2026-03-26-local-runtime-program-03b-execution-telemetry-design.md`
- Program 03C channel control-plane design:
  - `docs/plans/2026-03-26-local-runtime-program-03c-channel-control-plane-design.md`
- Daemon app and routers:
  - `backend/app/daemon/app.py`
  - `backend/app/daemon/routers/__init__.py`
  - `backend/app/daemon/routers/logs.py`
  - `backend/app/daemon/routers/diagnostics.py`
- Channel runtime:
  - `backend/app/channels/service.py`
  - `backend/app/channels/message_bus.py`
  - `backend/app/channels/runtime_state.py`
  - `backend/app/channels/repository.py`
- Existing UI/gateway routes to mirror selectively:
  - `backend/app/gateway/routers/channels.py`
- Existing control-plane tool layer:
  - `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
  - `backend/packages/harness/nion/tools/builtins/__init__.py`
  - `backend/packages/harness/nion/tools/tools.py`

Constraints to preserve:

- `/api/daemon/channels/*` is the control-plane authority for Program 03C.
- `/api/channels/*` remains for compatibility and UI; do not refactor it away in this phase.
- Do not move channel config or credential editing into daemon routes.
- Do not add session-override mutation in this phase.
- Do not store full message bodies in telemetry.
- Keep `message` human-readable and rich context in `details`.
- Prefer reusing existing channel service/repository logic over introducing new persistence paths.

## Task 1: Make the Daemon Own ChannelService Lifecycle and Shared Channel Telemetry

**Files:**
- Modify: `backend/app/daemon/app.py`
- Create: `backend/app/channels/telemetry.py`
- Modify: `backend/app/channels/service.py`
- Modify: `backend/app/channels/message_bus.py`
- Create: `backend/tests/test_channel_telemetry.py`
- Modify: `backend/tests/test_local_daemon_api.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_channel_telemetry.py`:

```python
from nion.telemetry.store import TelemetryStore


def test_channel_service_records_channel_started_event(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    from app.channels.telemetry import record_channel_started

    record_channel_started("feishu")

    store = TelemetryStore(paths_module.get_paths().telemetry_db_file)
    events = store.list_events(limit=10, category="channel")
    snapshot = store.get_snapshot("channel", "feishu")

    assert events[0].event_type == "channel_started"
    assert events[0].actor == "feishu"
    assert snapshot.status == "healthy"
```

Extend `backend/tests/test_local_daemon_api.py` with an assertion that the daemon app can mount and answer `GET /api/daemon/channels` once the router exists later in this plan, and for this task specifically verify daemon lifespan can start the channel service without crashing.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_channel_telemetry.py tests/test_local_daemon_api.py -q
```

Expected: `FAIL` because shared channel telemetry helpers do not exist yet and the daemon app does not own channel service lifecycle

**Step 3: Implement shared channel telemetry and daemon lifecycle ownership**

Create `backend/app/channels/telemetry.py` with bounded helpers such as:

- `record_channel_service_started()`
- `record_channel_service_stopped()`
- `record_channel_started(channel_name)`
- `record_channel_start_failed(channel_name, error)`
- `record_channel_stopped(channel_name)`
- `record_channel_restart_requested(channel_name)`
- `record_channel_restart_completed(channel_name)`
- `record_channel_restart_failed(channel_name, error)`
- `record_channel_inbound_enqueued(channel_name, chat_id, msg_type, queue_size)`
- `record_channel_outbound_dispatched(channel_name, chat_id, listener_count, text_length)`
- `record_channel_outbound_failed(channel_name, chat_id, error)`

Use:

- `category="channel"`
- `actor="system"` for service-level events
- `actor=channel_name` for per-channel events
- `scope_type="channel"` snapshots keyed by channel name

Modify `backend/app/daemon/app.py` so daemon lifespan starts and stops `ChannelService`.

Modify `backend/app/channels/service.py` and `backend/app/channels/message_bus.py` to emit the new events and snapshots.

Do not log full inbound/outbound text. Only log lengths, IDs, and bounded metadata.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_channel_telemetry.py tests/test_local_daemon_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/daemon/app.py backend/app/channels/telemetry.py backend/app/channels/service.py backend/app/channels/message_bus.py backend/tests/test_channel_telemetry.py backend/tests/test_local_daemon_api.py
git commit -F - <<'EOF'
Make channel runtime events visible to the daemon control plane

Constraint: Channel control-plane routes are not real in desktop mode unless the daemon owns ChannelService lifecycle itself
Rejected: Keep channel runtime startup gateway-only | Electron daemon control would remain observationally incomplete and operationally misleading
Confidence: high
Scope-risk: moderate
Directive: Keep channel telemetry bounded to IDs, counts, statuses, and short summaries; do not log full message bodies
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_channel_telemetry.py tests/test_local_daemon_api.py -q
Not-tested: Real IM provider start/stop behavior against external services
EOF
```

## Task 2: Expose Daemon-Owned Channel Read APIs

**Files:**
- Create: `backend/app/daemon/routers/channels.py`
- Modify: `backend/app/daemon/routers/__init__.py`
- Modify: `backend/app/daemon/app.py`
- Create: `backend/tests/test_daemon_channels_api.py`

**Step 1: Write the failing API tests**

Create `backend/tests/test_daemon_channels_api.py`:

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_daemon_channels_status_api_returns_service_status() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/api/daemon/channels")
        assert response.status_code == 200
        payload = response.json()
        assert "service_running" in payload
        assert "channels" in payload
```

Add tests for:

- `GET /api/daemon/channels/{name}` returns one diagnostic summary
- `GET /api/daemon/channels/{platform}/pair-requests`
- `GET /api/daemon/channels/{platform}/authorized-users`

Use seeded `ChannelRepository` state where needed.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_channels_api.py -q
```

Expected: `FAIL` because the daemon channels router does not exist yet

**Step 3: Implement read APIs**

Create `backend/app/daemon/routers/channels.py` with:

- `GET /api/daemon/channels`
- `GET /api/daemon/channels/{name}`
- `GET /api/daemon/channels/{platform}/pair-requests`
- `GET /api/daemon/channels/{platform}/authorized-users`

Use:

- `get_channel_service()` for live status
- `ChannelRepository()` for pair-request and authorized-user data
- telemetry snapshots for per-channel diagnostics fallback where appropriate

Keep the response models explicit and human-readable.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_channels_api.py tests/test_channel_runtime_status.py tests/test_channels_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/daemon/routers/channels.py backend/app/daemon/routers/__init__.py backend/app/daemon/app.py backend/tests/test_daemon_channels_api.py
git commit -F - <<'EOF'
Expose daemon-owned read APIs for channel status and diagnostics

Constraint: Program 03C needs channel inspection to live under the daemon control plane rather than the gateway-only UI routes
Rejected: Reuse /api/channels as the control-plane authority | that would keep daemon self-operations split across two route families
Confidence: high
Scope-risk: moderate
Directive: Keep daemon channel read routes focused on runtime/diagnostic state, not config editing
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_channels_api.py tests/test_channel_runtime_status.py tests/test_channels_api.py -q
Not-tested: Live desktop renderer consumption of the new daemon channel routes
EOF
```

## Task 3: Add Daemon Channel Control Actions and Log Operator Events

**Files:**
- Modify: `backend/app/daemon/routers/channels.py`
- Modify: `backend/app/channels/telemetry.py`
- Create: `backend/tests/test_daemon_channel_actions.py`

**Step 1: Write the failing action tests**

Create `backend/tests/test_daemon_channel_actions.py` with tests for:

- `POST /api/daemon/channels/{name}/restart`
- `POST /api/daemon/channels/{platform}/pairing-code`
- `POST /api/daemon/channels/{platform}/pair-requests/{request_id}/approve`
- `POST /api/daemon/channels/{platform}/pair-requests/{request_id}/reject`
- `POST /api/daemon/channels/{platform}/authorized-users/{user_id}/revoke`

Example starter:

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_daemon_channel_restart_action_returns_result(monkeypatch) -> None:
    with TestClient(create_app()) as client:
        response = client.post("/api/daemon/channels/feishu/restart")
        assert response.status_code == 200
        payload = response.json()
        assert "success" in payload
```

Also assert operator-action events are recorded in telemetry where practical.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_channel_actions.py -q
```

Expected: `FAIL` because the daemon action routes do not exist yet

**Step 3: Implement control actions**

Add daemon routes:

- `POST /api/daemon/channels/{name}/restart`
- `POST /api/daemon/channels/{platform}/pairing-code`
- `POST /api/daemon/channels/{platform}/pair-requests/{request_id}/approve`
- `POST /api/daemon/channels/{platform}/pair-requests/{request_id}/reject`
- `POST /api/daemon/channels/{platform}/authorized-users/{user_id}/revoke`

Use:

- `ChannelService.restart_channel()`
- `ChannelRepository.issue_pairing_code()`
- `ChannelRepository.decide_pair_request()`
- `ChannelRepository.revoke_authorized_user()`

Emit operator events:

- `channel_restart_requested`
- `channel_restart_completed`
- `channel_restart_failed`
- `channel_pairing_code_issued`
- `channel_pair_request_approved`
- `channel_pair_request_rejected`
- `channel_authorized_user_revoked`

Keep config and credential edits out of this router.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_daemon_channel_actions.py tests/test_daemon_channels_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/daemon/routers/channels.py backend/app/channels/telemetry.py backend/tests/test_daemon_channel_actions.py
git commit -F - <<'EOF'
Add daemon-owned runtime control actions for channels

Constraint: Channel self-operations need bounded runtime actions in the daemon control plane without absorbing config-center responsibilities
Rejected: Add channel config and credential edits to daemon routes | that would blur runtime control with configuration persistence and widen risk substantially
Confidence: high
Scope-risk: moderate
Directive: Keep channel control actions to restart, pairing workflow, and user revocation until a separate config mutation plan exists
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_channel_actions.py tests/test_daemon_channels_api.py -q
Not-tested: Real provider-side restart behavior and live pairing flows against external IM systems
EOF
```

## Task 4: Add Agent-Facing Channel Control-Plane Tools

**Files:**
- Modify: `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Modify: `backend/tests/test_control_plane_tools.py`

**Step 1: Write the failing tool tests**

Extend `backend/tests/test_control_plane_tools.py` with coverage for:

- `get_channels_status`
- `get_channel_diagnostics`
- `list_channel_pair_requests`
- `list_channel_authorized_users`
- `restart_channel_control_plane`
- `issue_channel_pairing_code`
- `approve_channel_pair_request`
- `reject_channel_pair_request`
- `revoke_channel_authorized_user`

Use seeded repository data and lightweight stubs/mocks for `ChannelService` where needed.

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_control_plane_tools.py -q
```

Expected: `FAIL` because channel control-plane tools do not exist yet

**Step 3: Implement tools**

Add read tools:

- `get_channels_status`
- `get_channel_diagnostics`
- `list_channel_pair_requests`
- `list_channel_authorized_users`

Add action tools:

- `restart_channel_control_plane`
- `issue_channel_pairing_code`
- `approve_channel_pair_request`
- `reject_channel_pair_request`
- `revoke_channel_authorized_user`

The tools should call the underlying service/repository directly, return JSON strings, and stay within the approved control scope for this phase.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_control_plane_tools.py tests/test_daemon_channel_actions.py tests/test_daemon_channels_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/builtins/control_plane_tools.py backend/packages/harness/nion/tools/builtins/__init__.py backend/packages/harness/nion/tools/tools.py backend/tests/test_control_plane_tools.py
git commit -F - <<'EOF'
Expose channel inspection and bounded runtime actions to agent tools

Constraint: Agents need to diagnose and operate channels through first-class tools rather than scraping gateway routes or raw storage
Rejected: Expose the entire gateway channels surface as agent tools | that would include config/session mutations outside Program 03C scope
Confidence: high
Scope-risk: moderate
Directive: Keep channel control-plane tools aligned with daemon-owned runtime actions only
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_control_plane_tools.py tests/test_daemon_channel_actions.py tests/test_daemon_channels_api.py -q
Not-tested: Agent behavior in a live self-remediation conversation
EOF
```

## Task 5: Lock Coverage Expectations and Update Docs

**Files:**
- Modify: `backend/tests/test_control_plane_logging_coverage.py`
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/desktop/development.md`

**Step 1: Add the failing coverage expectation**

Extend `backend/tests/test_control_plane_logging_coverage.py` to require:

- `channel service lifecycle events`
- `channel message-bus events`
- `channel diagnostics`
- `channel runtime control actions`

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_control_plane_logging_coverage.py -q
```

Expected: `FAIL` until docs are updated

**Step 3: Update docs**

Document:

- daemon now owns channel-service lifecycle in desktop mode
- `/api/daemon/channels/*` is the authoritative control-plane surface
- `/api/channels/*` remains for compatibility/UI
- approved control actions in 03C
- excluded actions: config, credentials, session override

**Step 4: Run final verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_channel_telemetry.py tests/test_daemon_channels_api.py tests/test_daemon_channel_actions.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py tests/test_execution_event_store.py tests/test_task_tool_telemetry.py tests/test_subagent_executor_telemetry.py tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_local_daemon_api.py tests/test_channel_runtime_status.py tests/test_channels_api.py tests/test_channel_repository.py tests/test_channel_pairing.py -q
uvx ruff check app/daemon app/channels packages/harness/nion/tools/builtins packages/harness/nion/subagents tests/test_channel_telemetry.py tests/test_daemon_channels_api.py tests/test_daemon_channel_actions.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py
uv run python -m nion.cli.main daemon status
```

Expected:

- pytest: `PASS`
- ruff: `All checks passed!` for the touched scope
- CLI: returns JSON daemon runtime info

**Step 5: Commit**

```bash
git add backend/tests/test_control_plane_logging_coverage.py README.md backend/README.md backend/CLAUDE.md docs/desktop/development.md
git commit -F - <<'EOF'
Document channel observability and bounded runtime control in the daemon control plane

Constraint: Program 03C needs explicit docs and regression expectations so channel self-operations stay aligned with the daemon control-plane architecture
Rejected: Leave channel control-plane coverage implicit in code only | future modifiers would not know which channel behaviors are intentional guarantees
Confidence: high
Scope-risk: narrow
Directive: Do not expand daemon channel routes into config or credential editing without a separate design and plan
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_channel_telemetry.py tests/test_daemon_channels_api.py tests/test_daemon_channel_actions.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py tests/test_execution_event_store.py tests/test_task_tool_telemetry.py tests/test_subagent_executor_telemetry.py tests/test_daemon_logs_api.py tests/test_daemon_diagnostics_api.py tests/test_local_daemon_api.py tests/test_channel_runtime_status.py tests/test_channels_api.py tests/test_channel_repository.py tests/test_channel_pairing.py -q && uvx ruff check app/daemon app/channels packages/harness/nion/tools/builtins packages/harness/nion/subagents tests/test_channel_telemetry.py tests/test_daemon_channels_api.py tests/test_daemon_channel_actions.py tests/test_control_plane_tools.py tests/test_control_plane_logging_coverage.py && uv run python -m nion.cli.main daemon status
Not-tested: Real external IM provider interactions and desktop renderer migration to daemon channel routes
EOF
```
