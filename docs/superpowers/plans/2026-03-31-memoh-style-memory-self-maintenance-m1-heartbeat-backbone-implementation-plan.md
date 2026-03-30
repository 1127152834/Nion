# Memoh-Style Memory Self-Maintenance M1 Heartbeat Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a first-class heartbeat backbone for Nion so always-on continuity no longer depends on ad hoc AutoDream polling and instead runs through an explicit heartbeat runtime, heartbeat logs, and heartbeat status surfaces.

**Architecture:** Follow Memoh's backbone pattern rather than inventing a bespoke scheduler. Nion's desktop daemon should own a dedicated heartbeat service that maintains state, logs executions, exposes status, and later becomes the trigger point for compaction, rebuild, and reflective self-maintenance. This milestone does not implement compaction or rebuild yet, but it must shape heartbeat so those later maintenance actions can plug into it cleanly.

**Tech Stack:** FastAPI, Pydantic, SQLite, Nion local daemon service, telemetry store patterns, desktop runtime IPC/runtime info, pytest, node:test, Memoh source references (`internal/heartbeat/`, `cmd/agent/main.go`, Swagger heartbeat logs API)

---

## Non-Negotiable Source Rule

Before finalizing any heartbeat shape or API in this milestone:

- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/heartbeat/types.go`
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/heartbeat/service.go`
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/heartbeat/trigger.go`
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/cmd/agent/main.go` startup wiring
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/spec/swagger.yaml` heartbeat log endpoints
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/packages/sdk/src/sdk.gen.ts` heartbeat SDK bindings

When Memoh source and README wording differ, source wins.

## Scope Boundary

This milestone intentionally does **not**:

- implement memory compaction
- implement memory rebuild
- implement full reflective self-maintenance
- redesign the notebook / knowledge-base product surface
- fully replace all existing AutoDream code

This milestone is about the heartbeat backbone only.

## File Structure And Ownership

### Backend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/models.py`
  - Heartbeat state and log models.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/store.py`
  - SQLite-backed heartbeat log persistence.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/service.py`
  - Heartbeat orchestration service and trigger loop contract.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/heartbeat.py`
  - Heartbeat status/log API surface.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_router.py`

### Backend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
  - Include heartbeat router in shared runtime.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py`
  - Replace direct AutoDream polling ownership with heartbeat-backed maintenance ownership.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/app.py`
  - Ensure heartbeat service attaches through daemon lifecycle if needed.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_scheduler.py`
  - Reposition as downstream maintenance consumer or transitional adapter.

### Frontend files to create or modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/heartbeat/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/heartbeat/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/heartbeat/hooks.ts`

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

## Task 1: Lock Heartbeat Backbone Contract In Backend Tests

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_router.py`

- [ ] **Step 1: Write a failing heartbeat store test**

```python
def test_heartbeat_store_round_trips_logs(tmp_path):
    from nion.heartbeat.store import HeartbeatStore

    store = HeartbeatStore(tmp_path / "telemetry.sqlite3")
    store.append_log(bot_id="local-agent", status="succeeded", summary="tick")

    logs = store.list_logs(bot_id="local-agent", limit=10, offset=0)

    assert len(logs) == 1
    assert logs[0].summary == "tick"
```

- [ ] **Step 2: Write a failing heartbeat service test**

```python
def test_heartbeat_service_records_tick_result(tmp_path):
    from nion.heartbeat.service import HeartbeatService

    service = HeartbeatService(base_dir=tmp_path)
    did_run = service.tick()

    assert did_run in {True, False}
    status = service.status()
    assert "running" in status
    assert "last_tick_at" in status
```

- [ ] **Step 3: Write a failing router test**

```python
def test_heartbeat_router_exposes_status_and_logs(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient
    from app.daemon.app import create_app
    from nion.config.paths import reset_paths

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        status_response = client.get("/api/heartbeat/status")
        logs_response = client.get("/api/heartbeat/logs")

    assert status_response.status_code == 200
    assert logs_response.status_code == 200
```

- [ ] **Step 4: Run tests to verify RED**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_heartbeat_store.py \
  tests/test_heartbeat_service.py \
  tests/test_heartbeat_router.py -q
```

Expected:
- tests fail because heartbeat modules and router do not exist yet

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_heartbeat_store.py backend/tests/test_heartbeat_service.py backend/tests/test_heartbeat_router.py
git commit -m "test: lock heartbeat backbone contract"
```

## Task 2: Implement Heartbeat Models And Store

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/store.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_store.py`

- [ ] **Step 1: Implement minimal heartbeat models**

Required shapes:

- `HeartbeatLog`
- `HeartbeatStatus`

Key fields:

- `bot_id` or equivalent local runtime subject
- `status`
- `summary`
- `started_at`
- `finished_at`
- `details`

- [ ] **Step 2: Implement SQLite-backed store**

The store must support:

- append log
- list logs
- delete logs
- load status snapshot
- save status snapshot

- [ ] **Step 3: Run heartbeat store test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_heartbeat_store.py -q
```

Expected:
- pass

- [ ] **Step 4: Commit**

```bash
git add backend/packages/harness/nion/heartbeat/models.py backend/packages/harness/nion/heartbeat/store.py backend/tests/test_heartbeat_store.py
git commit -m "feat: add heartbeat store primitives"
```

## Task 3: Implement Heartbeat Service

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_scheduler.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_service.py`

- [ ] **Step 1: Implement heartbeat service with explicit trigger contract**

The service must provide:

- `status()`
- `list_logs(limit, offset)`
- `delete_logs()`
- `tick()`
- `record_session_completed()` or equivalent signal ingestion point

- [ ] **Step 2: Make heartbeat service the owner of maintenance decisions**

For this milestone:

- heartbeat decides whether a maintenance cycle should run
- AutoDream scheduler must no longer be treated as the primary backbone
- transitional integration is allowed, but heartbeat must be the orchestrator

- [ ] **Step 3: Run heartbeat service tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_heartbeat_service.py -q
```

Expected:
- pass

- [ ] **Step 4: Commit**

```bash
git add backend/packages/harness/nion/heartbeat/service.py backend/packages/harness/nion/openviking/autodream_scheduler.py backend/tests/test_heartbeat_service.py
git commit -m "feat: add heartbeat backbone service"
```

## Task 4: Expose Heartbeat API Surface

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/heartbeat.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_router.py`

- [ ] **Step 1: Add heartbeat router**

The router should expose:

- `GET /api/heartbeat/status`
- `GET /api/heartbeat/logs`
- `DELETE /api/heartbeat/logs`

- [ ] **Step 2: Wire router into runtime app**

Update `create_runtime_app()` to include the heartbeat router in desktop runtime mode and shared runtime surfaces as appropriate.

- [ ] **Step 3: Connect daemon service to heartbeat service**

The daemon service must expose heartbeat runtime status through a dedicated service rather than piggybacking only on AutoDream scheduler state.

- [ ] **Step 4: Run router tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_heartbeat_router.py -q
```

Expected:
- pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/gateway/routers/heartbeat.py backend/app/runtime/app_factory.py backend/app/daemon/service.py backend/tests/test_heartbeat_router.py
git commit -m "feat: expose heartbeat api surface"
```

## Task 5: Add Frontend Heartbeat Types And Data Hooks

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/heartbeat/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/heartbeat/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/heartbeat/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

- [ ] **Step 1: Implement heartbeat types**

Include:

- `HeartbeatStatusResponse`
- `HeartbeatLog`
- `HeartbeatLogsResponse`

- [ ] **Step 2: Implement frontend API calls**

Include:

- `loadHeartbeatStatus()`
- `loadHeartbeatLogs()`
- `clearHeartbeatLogs()`

- [ ] **Step 3: Implement hooks**

Include:

- `useHeartbeatStatus()`
- `useHeartbeatLogs()`
- `useClearHeartbeatLogs()`

- [ ] **Step 4: Add i18n copy for heartbeat**

At minimum:

- status
- logs
- clear logs
- last run / last tick
- idle / running

- [ ] **Step 5: Run focused verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/config/backend-base-url.test.ts
```

Expected:
- existing desktop backend URL tests still pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/core/heartbeat/types.ts frontend/src/core/heartbeat/api.ts frontend/src/core/heartbeat/hooks.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts
git commit -m "feat: add heartbeat frontend data layer"
```

## Task 6: Update Strategic Docs With M1 Backbone Decisions

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

- [ ] **Step 1: Mark heartbeat progress in the parity baseline**

Update rows for:

- heartbeat service
- heartbeat logs
- always-on continuity

- [ ] **Step 2: Update roadmap notes**

Add M1 verification evidence placeholder and note that heartbeat is now the explicit maintenance backbone.

- [ ] **Step 3: Update settings/test guide**

Record that self-maintenance / heartbeat surfaces should be tested separately from notebook and memory.

- [ ] **Step 4: Run text verification**

Run:

```bash
rg -n "heartbeat backbone|heartbeat logs|self-maintenance" \
  docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md \
  docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md \
  docs/test/05-settings-config-center/README.md
```

Expected:
- all docs reflect the new heartbeat backbone

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md docs/test/05-settings-config-center/README.md
git commit -m "docs: record heartbeat backbone milestone"
```

## Spec Coverage Check

This milestone covers:

- Memoh-style heartbeat runtime backbone
- heartbeat logs
- heartbeat API surface
- daemon heartbeat ownership
- frontend heartbeat data hooks
- strategic documentation alignment

This milestone intentionally does not cover:

- compaction implementation
- rebuild implementation
- reflective maintenance implementation
- memory page redesign
- notebook / project module redesign
