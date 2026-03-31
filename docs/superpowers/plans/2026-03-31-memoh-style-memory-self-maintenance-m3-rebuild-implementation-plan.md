# Memoh-Style Memory Self-Maintenance M3 Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Memoh-style memory rebuild in Nion so structured memory runtime can be reconstructed from canonical source and provider-visible state, with logs and operator visibility.

**Architecture:** Follow Memoh's `SourceSyncProvider` idea: rebuild is not ordinary search or compaction, but an explicit synchronization action that restores runtime memory from source-of-truth storage. In Nion's personal assistant model, rebuild must treat structured memory itself as the canonical source, while notebook stays out of the memory rebuild scope. Heartbeat may trigger rebuild later, but rebuild must first exist as a manual, observable maintenance action.

**Tech Stack:** FastAPI, Pydantic, SQLite, Memory OS providers, compaction backbone, heartbeat backbone, pytest, node:test, Memoh rebuild references (`provider.go`, built-in runtime rebuilds, memory rebuild handler/OpenAPI/SDK)

---

## Non-Negotiable Source Rule

Before implementing rebuild behavior:

- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/provider.go`
- [ ] Read the built-in rebuild implementations under:
  - `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/builtin/dense_runtime.go`
  - `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/builtin/sparse_runtime.go`
  - `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/builtin/builtin.go`
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/mem0/mem0.go` rebuild sections
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/handlers/memory.go` rebuild endpoint
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/spec/swagger.yaml` rebuild surface
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/packages/sdk/src/sdk.gen.ts` rebuild SDK binding

When Memoh source and README wording differ, source wins.

## Scope Boundary

This milestone intentionally does **not**:

- compact memory further beyond M2
- implement the full reflective self-maintenance layer
- rebuild notebook / second-brain content
- redesign the main product surface
- finish Mem0 provider parity end-to-end

This milestone is specifically about memory rebuild, rebuild logs, and provider-aware rebuild status.

## File Structure And Ownership

### Backend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/rebuild/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/rebuild/store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/rebuild/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/rebuild.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_router.py`

### Backend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/builtin_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`

### Frontend files to create or modify

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/rebuild/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/rebuild/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/rebuild/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

## Task 1: Lock Rebuild Contract In Failing Tests

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_router.py`

- [ ] **Step 1: Write a failing rebuild store test**

```python
def test_rebuild_store_round_trips_logs(tmp_path):
    from nion.rebuild.store import RebuildStore

    store = RebuildStore(tmp_path / "telemetry.sqlite3")
    store.append_log(status="succeeded", summary="Rebuilt memory", source_count=2)

    logs = store.list_logs(limit=10, offset=0)

    assert len(logs) == 1
    assert logs[0].summary == "Rebuilt memory"
```

- [ ] **Step 2: Write a failing rebuild service test**

```python
def test_rebuild_service_restores_memory_runtime(tmp_path):
    from nion.rebuild.service import RebuildService

    service = RebuildService(base_dir=tmp_path)
    result = service.rebuild()

    assert "status" in result
    assert "restored_count" in result
```

- [ ] **Step 3: Write a failing rebuild router test**

```python
def test_rebuild_router_exposes_rebuild_logs_and_status(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient
    from app.daemon.app import create_app
    from nion.config.paths import reset_paths

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        rebuild_response = client.post("/api/memory/rebuild")
        logs_response = client.get("/api/memory/rebuild/logs")
        status_response = client.get("/api/memory/status")

    assert rebuild_response.status_code == 200
    assert logs_response.status_code == 200
    assert status_response.status_code == 200
```

- [ ] **Step 4: Run tests to verify RED**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_rebuild_store.py \
  tests/test_rebuild_service.py \
  tests/test_rebuild_router.py -q
```

Expected:
- tests fail because rebuild modules and routes do not exist yet

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_rebuild_store.py backend/tests/test_rebuild_service.py backend/tests/test_rebuild_router.py
git commit -m "test: lock rebuild contract"
```

## Task 2: Implement Rebuild Models, Store, And Service

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/rebuild/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/rebuild/store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/rebuild/service.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_store.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_service.py`

- [ ] **Step 1: Implement rebuild models**

Required shapes:

- `RebuildLog`
- `RebuildResult`
- `RebuildListLogsResponse`

Fields should include:

- status
- summary
- source_count
- restored_count
- skipped_count
- started_at
- completed_at
- details

- [ ] **Step 2: Implement SQLite-backed rebuild store**

The store must support:

- append log
- list logs
- delete logs

- [ ] **Step 3: Implement rebuild service**

The first rebuild version should:

- read current structured memory payload
- reconstruct runtime memory state from canonical structured source
- avoid notebook input entirely
- preserve valid current facts/summaries rather than wiping them blindly
- log the rebuild result

Default rule:

- for built-in, canonical source is persisted memory payload
- for openviking, canonical source is provider-visible memory payload, not notebook resources
- for mem0, return explicit unsupported result until provider parity milestone

- [ ] **Step 4: Run rebuild store/service tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_rebuild_store.py \
  tests/test_rebuild_service.py -q
```

Expected:
- pass

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/rebuild/models.py backend/packages/harness/nion/rebuild/store.py backend/packages/harness/nion/rebuild/service.py backend/tests/test_rebuild_store.py backend/tests/test_rebuild_service.py
git commit -m "feat: add rebuild service primitives"
```

## Task 3: Wire Rebuild Into Memory Runtime And Heartbeat Backbone

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/builtin_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`

- [ ] **Step 1: Add rebuild hook to memory runtime**

At minimum expose:

- `rebuild_memory(...)`
- enrich `memory_status(...)`

- [ ] **Step 2: Keep rebuild manual-first**

For M3:

- heartbeat may gain a rebuild hook point
- but rebuild should remain manual-first and explicit
- do not silently rebuild on every heartbeat

- [ ] **Step 3: Preserve provider-specific behavior**

Defaults:

- built-in: supported
- openviking: supported through provider-aware adapter or compatibility path
- mem0: explicit unsupported

- [ ] **Step 4: Run heartbeat + rebuild regression tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_heartbeat_store.py \
  tests/test_heartbeat_service.py \
  tests/test_heartbeat_router.py \
  tests/test_rebuild_service.py -q
```

Expected:
- pass

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/heartbeat/service.py backend/app/daemon/service.py backend/packages/harness/nion/memory_os/builtin_provider.py backend/packages/harness/nion/memory_os/openviking_provider.py backend/packages/harness/nion/memory_os/service.py
git commit -m "feat: wire rebuild into memory runtime"
```

## Task 4: Expose Rebuild API Surface

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/rebuild.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_rebuild_router.py`

- [ ] **Step 1: Add rebuild logs router**

Expose:

- `GET /api/memory/rebuild/logs`
- `DELETE /api/memory/rebuild/logs`

- [ ] **Step 2: Extend memory router**

Expose:

- `POST /api/memory/rebuild`
- enrich `GET /api/memory/status` with rebuild fields

- [ ] **Step 3: Wire router into runtime app**

Add rebuild router to shared runtime app factory.

- [ ] **Step 4: Run rebuild router tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_rebuild_router.py -q
```

Expected:
- pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/gateway/routers/rebuild.py backend/app/gateway/routers/memory.py backend/app/runtime/app_factory.py backend/tests/test_rebuild_router.py
git commit -m "feat: expose rebuild api surface"
```

## Task 5: Add Frontend Rebuild Data Layer

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/rebuild/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/rebuild/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/rebuild/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

- [ ] **Step 1: Implement rebuild types**

Include:

- rebuild result
- rebuild log item
- rebuild logs response

- [ ] **Step 2: Implement API calls**

Include:

- `runMemoryRebuild()`
- `loadRebuildLogs()`
- `clearRebuildLogs()`

- [ ] **Step 3: Implement hooks**

Include:

- `useRunMemoryRebuild()`
- `useRebuildLogs()`
- `useClearRebuildLogs()`

- [ ] **Step 4: Add i18n copy**

At minimum:

- rebuild
- rebuild logs
- restore
- provider-supported / unsupported

- [ ] **Step 5: Run frontend focused verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/config/backend-base-url.test.ts
```

Expected:
- desktop backend fallback tests still pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/core/rebuild/types.ts frontend/src/core/rebuild/api.ts frontend/src/core/rebuild/hooks.ts frontend/src/core/memory/api.ts frontend/src/core/memory/hooks.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts
git commit -m "feat: add rebuild frontend data layer"
```

## Task 6: Milestone Verification And Docs Update

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

- [ ] **Step 1: Update parity baseline**

Mark rebuild-related rows forward where implemented:

- memory rebuild
- memory status
- provider-aware rebuild

- [ ] **Step 2: Update roadmap evidence**

Record M3 evidence and note remaining gaps for reflective maintenance.

- [ ] **Step 3: Update test guide**

Document:

- rebuild api tests
- rebuild logs
- desktop-dev rebuild smoke

- [ ] **Step 4: Run full M3 targeted verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_heartbeat_store.py \
  tests/test_heartbeat_service.py \
  tests/test_heartbeat_router.py \
  tests/test_compaction_store.py \
  tests/test_compaction_service.py \
  tests/test_compaction_router.py \
  tests/test_rebuild_store.py \
  tests/test_rebuild_service.py \
  tests/test_rebuild_router.py -q

cd /Users/zhangtiancheng/Documents/项目/agent/nion && make desktop-dev
```

Then verify:

- `POST /api/memory/rebuild`
- `GET /api/memory/rebuild/logs`
- `GET /api/memory/status`

Expected:
- rebuild API reachable from desktop runtime
- rebuild run succeeds

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md docs/test/05-settings-config-center/README.md
git commit -m "docs: record rebuild milestone progress"
```

## Spec Coverage Check

This milestone covers:

- rebuild runtime
- rebuild logs
- rebuild API
- provider-aware rebuild
- heartbeat-compatible rebuild hook

This milestone intentionally does not cover:

- reflective self-maintenance
- notebook/product IA redesign
- full provider parity
