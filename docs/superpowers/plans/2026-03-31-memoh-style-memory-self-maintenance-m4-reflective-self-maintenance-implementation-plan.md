# Memoh-Style Memory Self-Maintenance M4 Reflective Self-Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old standalone `AutoDream` product framing with a heartbeat-driven reflective self-maintenance layer that writes inspectable maintenance logs, emits bounded proposals, and keeps legacy `/api/autodream/*` routes alive as compatibility wrappers only.

**Architecture:** Follow Memoh's backbone: heartbeat remains the primary continuity trigger, while reflective maintenance becomes one bounded maintenance pass inside that loop instead of its own top-level scheduler product. Nion should introduce a first-class `self_maintenance` domain with its own models, store, scheduler, service, and API surface, then adapt existing AutoDream modules into thin compatibility aliases. Notebook must be fully removed from reflective signal gathering so the maintenance loop only acts on agent-owned assets such as memory runtime state, heartbeat context, compaction/rebuild outputs, and recent recall history.

**Tech Stack:** FastAPI, Pydantic, SQLite, local filesystem markdown journals, Heartbeat/Compaction/Rebuild backbones, Memory OS runtime, React, TanStack Query, node:test, pytest, Electron desktop runtime, Memoh source references under `internal/heartbeat/`, handlers, command surfaces, and OpenAPI/SDK contracts.

---

## Non-Negotiable Source Rule

Before implementing M4 behavior, read these Memoh sources and treat source as the authority when README wording differs:

- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/heartbeat/service.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/heartbeat/trigger.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/handlers/heartbeat.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/handlers/settings.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/conversation/flow/heartbeat_gateway.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/conversation/flow/resolver_trigger.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/command/heartbeat_cmd.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/command/settings.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/session/service.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/spec/swagger.yaml` heartbeat/settings/compaction/rebuild sections
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/packages/sdk/src/sdk.gen.ts`

## Scope Boundary

This milestone intentionally does **not**:

- redesign the full IA into standalone `Knowledge Base / Memory / Self-Maintenance` pages yet
- move notebook UI or notebook operator tools into a new page
- implement provider parity for Mem0 beyond explicit unsupported behavior
- allow maintenance to edit notebook files or treat notebook as maintenance input
- automate skill mutation, workflow mutation, or code changes from proposals
- remove `/api/autodream/*` immediately; those routes stay as legacy compatibility wrappers

This milestone is specifically about:

- reflective self-maintenance models and storage
- heartbeat-driven maintenance scheduling
- new primary `/api/self-maintenance/*` surface
- legacy `AutoDream` compatibility mapping
- minimal frontend inspect/operator migration away from old AutoDream copy

## File Structure And Ownership

### Backend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/signals.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/policy.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/scheduler.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/self_maintenance.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_router.py`

### Backend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/autodream.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/threads.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_scheduler.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_store.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/__init__.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_autodream_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_autodream_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_autodream_scheduler.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_autodream_paths.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_daemon_autodream_integration.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_threads_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_service.py`

### Frontend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/index.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/api.test.ts`

### Frontend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/autodream/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/autodream/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/autodream/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts`

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

## Task 1: Lock Reflective Maintenance Contract In Failing Tests

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_autodream_router.py`

- [ ] **Step 1: Write a failing store test for log/state round-trip**

```python
def test_self_maintenance_store_round_trips_log_and_state(tmp_path):
    from nion.self_maintenance.models import ReflectiveRunState
    from nion.self_maintenance.store import SelfMaintenanceStore

    store = SelfMaintenanceStore(base_dir=tmp_path)
    store.save_state(
        ReflectiveRunState(
            last_run_at="2026-03-31T10:00:00Z",
            session_count_since_last_run=2,
            last_run_status="succeeded",
            last_run_summary="Reviewed recent memory drift.",
        )
    )
    store.append_log(
        trigger="manual",
        status="succeeded",
        summary="Reviewed recent memory drift.",
        memory_update_proposals=["Merge duplicate onboarding preference facts."],
    )

    state = store.load_state()
    logs = store.list_logs(limit=10, offset=0)

    assert state.last_run_status == "succeeded"
    assert logs[0].trigger == "manual"
    assert logs[0].memory_update_proposals == [
        "Merge duplicate onboarding preference facts."
    ]
```

- [ ] **Step 2: Write a failing service test that proves notebook is excluded**

```python
def test_self_maintenance_service_generates_agent_only_proposals(tmp_path):
    from nion.self_maintenance.service import SelfMaintenanceService

    service = SelfMaintenanceService(base_dir=tmp_path)
    result = service.run(trigger="manual", query="recent memory drift")

    assert result.entry.summary
    assert result.entry.sources
    assert "notebook" not in result.entry.sources
    assert isinstance(result.action_proposals, list)
    assert isinstance(result.self_upgrade_proposals, list)
```

- [ ] **Step 3: Write a failing router test for the new primary surface**

```python
def test_self_maintenance_router_exposes_run_status_and_logs(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient
    from app.daemon.app import create_app
    from nion.config.paths import reset_paths

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        run_response = client.post(
            "/api/self-maintenance/run",
            json={"query": "recent memory drift"},
        )
        status_response = client.get("/api/self-maintenance/status")
        logs_response = client.get("/api/self-maintenance/logs")

    assert run_response.status_code == 200
    assert status_response.status_code == 200
    assert logs_response.status_code == 200
```

- [ ] **Step 4: Extend legacy AutoDream router test to require compatibility mapping**

```python
def test_autodream_router_maps_to_legacy_response_shape(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient
    from app.daemon.app import create_app
    from nion.config.paths import reset_paths

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.post("/api/autodream/run", json={"query": "recent memory drift"})

    body = response.json()
    assert response.status_code == 200
    assert "entry" in body
    assert "entry_path" in body
    assert "agent_memory_updates" in body
    assert "action_proposals" in body
```

- [ ] **Step 5: Run tests to verify RED**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_self_maintenance_store.py \
  tests/test_self_maintenance_service.py \
  tests/test_self_maintenance_router.py \
  tests/test_autodream_router.py -q
```

Expected:

- self-maintenance modules and routes are missing
- legacy autodream compatibility assertions fail until mapping is added

- [ ] **Step 6: Commit**

```bash
git add \
  backend/tests/test_self_maintenance_store.py \
  backend/tests/test_self_maintenance_service.py \
  backend/tests/test_self_maintenance_router.py \
  backend/tests/test_autodream_router.py
git commit -m "test: lock reflective self-maintenance contract"
```

## Task 2: Add First-Class Self-Maintenance Paths, Models, And Store

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/store.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_autodream_paths.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_store.py`

- [ ] **Step 1: Introduce new canonical storage paths and keep legacy aliases**

Use this shape so `self-maintenance` becomes canonical while `autodream_*` stays as a compatibility alias:

```python
@property
def self_maintenance_dir(self) -> Path:
    return self.base_dir / "self-maintenance"

@property
def self_maintenance_journal_dir(self) -> Path:
    return self.self_maintenance_dir / "journal" / "reflective"

@property
def self_maintenance_state_file(self) -> Path:
    return self.self_maintenance_dir / "state.json"

@property
def autodream_journal_dir(self) -> Path:
    return self.self_maintenance_journal_dir

@property
def autodream_state_file(self) -> Path:
    return self.self_maintenance_state_file
```

- [ ] **Step 2: Implement core Pydantic models**

Model set must include:

```python
class ReflectiveEntry(BaseModel):
    run_id: str
    trigger: str
    started_at: str
    ended_at: str
    summary: str
    what_i_did: list[str] = Field(default_factory=list)
    what_i_learned: list[str] = Field(default_factory=list)
    stale_items: list[str] = Field(default_factory=list)
    memory_update_proposals: list[str] = Field(default_factory=list)
    prune_proposals: list[str] = Field(default_factory=list)
    action_proposals: list[str] = Field(default_factory=list)
    self_upgrade_proposals: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)

class ReflectiveRunState(BaseModel):
    last_run_at: str | None = None
    session_count_since_last_run: int = 0
    running: bool = False
    last_run_status: str | None = None
    last_run_summary: str | None = None
    last_query: str | None = None
```

- [ ] **Step 3: Implement the store with markdown journal plus SQLite log index**

The store must support:

- `load_state()`
- `save_state(state)`
- `append_log(...)`
- `list_logs(limit, offset)`
- `delete_logs()`
- `write_entry(entry)` returning the markdown file path

Markdown rendering must use the new product language:

```markdown
# Reflective Maintenance: 2026-03-31

## Summary
...

## What I Did
- ...

## Proposed Memory Updates
- ...
```

- [ ] **Step 4: Run store/path tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_self_maintenance_store.py \
  tests/test_autodream_paths.py -q
```

Expected:

- pass
- legacy autodream path test is updated to assert alias compatibility instead of the old `openviking/journal/autodream` path

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/paths.py \
  backend/packages/harness/nion/self_maintenance/models.py \
  backend/packages/harness/nion/self_maintenance/store.py \
  backend/tests/test_self_maintenance_store.py \
  backend/tests/test_autodream_paths.py
git commit -m "feat: add self-maintenance storage backbone"
```

## Task 3: Build Signal Collection, Policy, And Reflective Service

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/signals.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/policy.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_store.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_service.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_autodream_service.py`

- [ ] **Step 1: Collect only agent-owned maintenance signals**

`signals.py` must gather from these sources:

- heartbeat status/logs
- memory runtime status
- memory usage
- recent compaction logs
- recent rebuild logs
- recent recall history for the query

It must **not** gather:

- notebook search results
- notebook files
- notebook index state

Recommended signal model:

```python
class SelfMaintenanceSignals(BaseModel):
    heartbeat_status: dict[str, object]
    memory_runtime: dict[str, object]
    memory_usage: dict[str, object]
    recent_compaction_summaries: list[str] = Field(default_factory=list)
    recent_rebuild_summaries: list[str] = Field(default_factory=list)
    recall_results: list[RecallSearchResult] = Field(default_factory=list)
```

- [ ] **Step 2: Move eligibility logic into a neutral policy module**

Preserve the current cadence rule, but rename the policy so it is no longer AutoDream-branded:

```python
def should_run_reflective_maintenance(
    *,
    last_run_at: str | None,
    session_count_since_last_run: int,
    now: str,
) -> bool:
    ...
```

Current rule remains:

- at least 24 hours since last run
- more than 5 completed sessions since last run

- [ ] **Step 3: Implement `SelfMaintenanceService.run()`**

The result shape must be the new primary contract:

```python
class SelfMaintenanceResult(BaseModel):
    entry: ReflectiveEntry
    entry_path: str
    memory_update_proposals: list[str]
    prune_proposals: list[str]
    action_proposals: list[str]
    self_upgrade_proposals: list[str]
```

The first implementation should:

- build a reflective summary from the collected signals
- create conservative proposals only
- avoid direct mutation of memory facts beyond proposals
- write the markdown journal entry
- append a structured log
- update run state

- [ ] **Step 4: Turn AutoDream service/models/store into thin legacy adapters**

Legacy modules should not own the logic anymore. They should delegate to `self_maintenance` and map names:

```python
class AutoDreamService:
    def run(self, *, query: str, manual: bool = False) -> AutoDreamResult:
        result = SelfMaintenanceService(base_dir=self._base_dir).run(
            trigger="manual" if manual else "heartbeat",
            query=query,
        )
        return AutoDreamResult(
            entry=DreamEntry.model_validate(result.entry.model_dump()),
            entry_path=Path(result.entry_path),
            agent_memory_updates=result.memory_update_proposals,
            user_memory_candidates=[],
            action_proposals=result.action_proposals,
        )
```

- [ ] **Step 5: Run service and compatibility tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_self_maintenance_service.py \
  tests/test_autodream_service.py \
  tests/test_autodream_router.py -q
```

Expected:

- pass
- compatibility tests confirm old route shape still works

- [ ] **Step 6: Commit**

```bash
git add \
  backend/packages/harness/nion/self_maintenance/signals.py \
  backend/packages/harness/nion/self_maintenance/policy.py \
  backend/packages/harness/nion/self_maintenance/service.py \
  backend/packages/harness/nion/openviking/autodream_service.py \
  backend/packages/harness/nion/openviking/autodream_models.py \
  backend/packages/harness/nion/openviking/autodream_store.py \
  backend/tests/test_self_maintenance_service.py \
  backend/tests/test_autodream_service.py \
  backend/tests/test_autodream_router.py
git commit -m "feat: add reflective maintenance service and legacy autodream adapter"
```

## Task 4: Wire Heartbeat, Scheduler, Daemon, And New Router Surface

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/self_maintenance/scheduler.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/self_maintenance.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/autodream.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/threads.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/autodream_scheduler.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_self_maintenance_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_autodream_scheduler.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_daemon_autodream_integration.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_threads_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_heartbeat_service.py`

- [ ] **Step 1: Introduce a neutral scheduler on top of the new policy/service**

`scheduler.py` should own:

- `load_state()`
- `status()`
- `record_session_completed()`
- `tick()`

and return status copy like:

```python
{
    "running": False,
    "last_run_at": "...",
    "last_run_status": "succeeded",
    "last_run_summary": "...",
    "session_count_since_last_run": 3,
    "next_eligibility_hint": "...",
}
```

- [ ] **Step 2: Enrich heartbeat logs with reflective maintenance result**

`HeartbeatService.tick()` should stop treating maintenance as a bare boolean. Replace it with a structured result:

```python
maintenance_result = self._run_maintenance()
status_value = "succeeded" if maintenance_result.ran else "idle"
details = {
    "maintenance_triggered": maintenance_result.ran,
    "maintenance_status": maintenance_result.status,
    "maintenance_summary": maintenance_result.summary,
}
```

This keeps heartbeat as the orchestration backbone instead of a thin timer.

- [ ] **Step 3: Make the daemon own the neutral scheduler, not the old autodream scheduler**

`LocalDaemonService` should expose:

- `self_maintenance_status()`
- `record_self_maintenance_session_completed()`

and keep these legacy aliases:

- `autodream_status()`
- `record_autodream_session_completed()`

Legacy methods should delegate to the new neutral methods instead of owning separate state.

- [ ] **Step 4: Expose the new primary API and downgrade AutoDream to compatibility**

Primary router:

- `POST /api/self-maintenance/run`
- `GET /api/self-maintenance/status`
- `GET /api/self-maintenance/logs`
- `DELETE /api/self-maintenance/logs`

Legacy router rules:

- `/api/autodream/run` delegates to the new service and maps response fields
- `/api/autodream/status` delegates to daemon `self_maintenance_status()` and preserves old keys

- [ ] **Step 5: Run backend orchestration tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_self_maintenance_router.py \
  tests/test_autodream_scheduler.py \
  tests/test_daemon_autodream_integration.py \
  tests/test_threads_router.py \
  tests/test_heartbeat_service.py -q
```

Expected:

- pass
- daemon and thread completion paths update the new scheduler state
- legacy autodream scheduler tests are updated to verify alias behavior rather than primary ownership

- [ ] **Step 6: Commit**

```bash
git add \
  backend/packages/harness/nion/self_maintenance/scheduler.py \
  backend/app/gateway/routers/self_maintenance.py \
  backend/packages/harness/nion/heartbeat/models.py \
  backend/packages/harness/nion/heartbeat/service.py \
  backend/app/daemon/service.py \
  backend/app/runtime/app_factory.py \
  backend/app/gateway/routers/autodream.py \
  backend/app/gateway/routers/threads.py \
  backend/packages/harness/nion/openviking/autodream_scheduler.py \
  backend/tests/test_self_maintenance_router.py \
  backend/tests/test_autodream_scheduler.py \
  backend/tests/test_daemon_autodream_integration.py \
  backend/tests/test_threads_router.py \
  backend/tests/test_heartbeat_service.py
git commit -m "feat: wire heartbeat-driven self-maintenance runtime"
```

## Task 5: Add Frontend Self-Maintenance Data Layer And Retire AutoDream Copy

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/index.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/self-maintenance/api.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/autodream/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/autodream/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/autodream/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

- [ ] **Step 1: Add the new core API layer for self-maintenance**

Minimum API set:

```ts
export async function runSelfMaintenance(input: { query: string }) { ... }
export async function loadSelfMaintenanceStatus() { ... }
export async function loadSelfMaintenanceLogs() { ... }
export async function clearSelfMaintenanceLogs() { ... }
```

`api.test.ts` must lock the new route contract:

```ts
void test("self-maintenance api hits primary maintenance endpoint", async () => {
  let seen = "";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen = `${init?.method ?? "GET"} ${String(input)}`;
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  }) as typeof fetch;

  await loadSelfMaintenanceLogs();
  assert.match(seen, /GET .*\\/api\\/self-maintenance\\/logs/);
});
```

- [ ] **Step 2: Make the settings page use the new core layer**

`memory-settings-page.tsx` should stop importing the primary operator action from `@/core/autodream` and switch to `@/core/self-maintenance`.

Allowed after this step:

- legacy `@/core/autodream` remains for compatibility

Not allowed after this step:

- the primary settings operator panel still branded as `AutoDream`

- [ ] **Step 3: Rebuild the agent-core panel copy and section structure**

The panel should render:

- heartbeat status summary
- manual run input + button
- latest reflective summary
- `memory_update_proposals`
- `prune_proposals`
- `action_proposals`
- `self_upgrade_proposals`

Recommended section labels:

```ts
selfMaintenance: {
  title: "Self-Maintenance",
  description:
    "Inspect heartbeat-driven reflective maintenance for the agent itself. This surface never edits notebook assets.",
  runButton: "Run maintenance now",
  ...
}
```

Chinese copy should mirror the same boundary:

```ts
selfMaintenance: {
  title: "自我维护",
  description:
    "查看由 heartbeat 驱动的智能体自我维护结果。这里不会直接操作你的笔记资产。",
  ...
}
```

- [ ] **Step 4: Update contract tests so UI boundaries stop referencing notebook and old AutoDream semantics**

`memory-agent-core-panel.contract.test.ts` should assert:

- self-maintenance strings exist
- notebook reindex/search controls do not exist
- old AutoDream copy is not the primary heading anymore

`memory-settings-page.openviking.contract.test.ts` should assert:

- the page imports the new self-maintenance hook
- notebook retrieval controls are still absent from memory panels

- [ ] **Step 5: Run frontend focused tests and static checks**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/core/self-maintenance/api.test.ts \
  src/components/workspace/settings/memory-agent-core-panel.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm exec eslint \
  src/core/self-maintenance \
  src/core/autodream \
  src/components/workspace/settings/memory-agent-core-panel.tsx \
  src/components/workspace/settings/memory-settings-page.tsx \
  src/core/i18n/locales/en-US.ts \
  src/core/i18n/locales/zh-CN.ts
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm typecheck
```

Expected:

- all focused tests pass
- typecheck passes, or any unrelated pre-existing failure is documented before merge

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/core/self-maintenance \
  frontend/src/core/autodream \
  frontend/src/components/workspace/settings/memory-agent-core-panel.tsx \
  frontend/src/components/workspace/settings/memory-agent-core-panel.contract.test.ts \
  frontend/src/components/workspace/settings/memory-settings-page.tsx \
  frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts
git commit -m "feat: move settings maintenance surface onto self-maintenance"
```

## Task 6: Update Provider Surface, Docs, And Run Full Verification

**Files:**

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/__init__.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

- [ ] **Step 1: Rename provider-visible maintenance journal domain and keep legacy alias**

`openviking_provider.py` should prefer a neutral domain such as:

- `self_maintenance_journal`

while still honoring:

- `autodream_journal`

for compatibility if any tests or existing callers still ask for it.

- [ ] **Step 2: Update exported symbols and docs**

`nion.openviking.__init__.py` must export the canonical self-maintenance symbols if the package is still used as a transitional import surface.

The roadmap and parity baseline must record:

- M4 is implemented as `self-maintenance`
- `AutoDream` is now legacy compatibility only
- notebook remains outside memory/self-maintenance

- [ ] **Step 3: Run targeted backend regression**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_self_maintenance_store.py \
  tests/test_self_maintenance_service.py \
  tests/test_self_maintenance_router.py \
  tests/test_heartbeat_service.py \
  tests/test_autodream_service.py \
  tests/test_autodream_router.py \
  tests/test_autodream_scheduler.py \
  tests/test_daemon_autodream_integration.py \
  tests/test_threads_router.py \
  tests/test_memory_os_openviking_provider.py \
  tests/test_compaction_service.py \
  tests/test_rebuild_service.py -q
```

- [ ] **Step 4: Run desktop smoke**

If the worktree is missing desktop dependencies, install them first:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && pnpm --dir desktop install
```

Then run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && make desktop-dev
```

After the daemon is up, verify these routes manually:

```bash
curl -s http://127.0.0.1:8000/api/self-maintenance/status
curl -s -X POST http://127.0.0.1:8000/api/self-maintenance/run \
  -H 'Content-Type: application/json' \
  -d '{"query":"recent memory drift"}'
curl -s http://127.0.0.1:8000/api/self-maintenance/logs
curl -s -X POST http://127.0.0.1:8000/api/autodream/run \
  -H 'Content-Type: application/json' \
  -d '{"query":"recent memory drift"}'
```

Expected:

- primary self-maintenance routes return `200`
- legacy autodream run also returns `200`
- primary maintenance response includes `memory_update_proposals`, `prune_proposals`, `action_proposals`, `self_upgrade_proposals`
- legacy autodream response still includes `entry`, `entry_path`, `agent_memory_updates`, `action_proposals`

- [ ] **Step 5: Re-review for “patch-on-patch” architecture before final checkpoint**

Explicit review questions:

- Is any new logic still primarily living inside `openviking/autodream_*` instead of `self_maintenance/*`?
- Does any signal collector still read notebook content?
- Is heartbeat still logging maintenance as a bare boolean instead of a structured result?
- Is the settings page still using AutoDream as the primary heading or mental model?

If any answer is yes, refactor before finalizing M4.

- [ ] **Step 6: Commit final M4 checkpoint**

```bash
git add \
  backend/packages/harness/nion/memory_os/openviking_provider.py \
  backend/packages/harness/nion/memory_os/service.py \
  backend/packages/harness/nion/openviking/__init__.py \
  backend/tests/test_memory_os_openviking_provider.py \
  docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md \
  docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md \
  docs/test/05-settings-config-center/README.md
git commit -m "docs: record reflective self-maintenance milestone"
```

## Self-Review Checklist

Before executing this plan, verify the document itself satisfies these conditions:

- [ ] The primary concept is `self-maintenance`, not a rebranded AutoDream patch
- [ ] Notebook is excluded from reflective inputs in every task
- [ ] `/api/self-maintenance/*` is primary and `/api/autodream/*` is explicitly legacy
- [ ] Heartbeat remains the orchestrator instead of a side timer
- [ ] The settings panel migration is scoped to M4, while full IA extraction stays deferred to M5
- [ ] Verification includes backend, frontend, and `make desktop-dev`

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m4-reflective-maintenance/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-m4-reflective-self-maintenance-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints
