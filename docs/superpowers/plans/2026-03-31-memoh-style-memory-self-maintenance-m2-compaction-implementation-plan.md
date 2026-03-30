# Memoh-Style Memory Self-Maintenance M2 Compaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Memoh-style memory compaction in Nion as a first-class maintenance capability, including compaction execution, compaction logs, and minimal memory status/usage support.

**Architecture:** Follow Memoh's split between memory compaction action and compaction log management, but adapt it to Nion's personal-assistant model. Nion should expose compaction through its existing memory runtime rather than a multi-bot shell. Heartbeat becomes the maintenance trigger, while compaction remains both manually triggerable and observable through logs and status. Memory compaction must stay scoped to structured memory only and must not treat notebook content as memory input.

**Tech Stack:** FastAPI, Pydantic, SQLite, Memory OS provider layer, Heartbeat backbone, desktop daemon, pytest, node:test, Memoh compaction source references (`internal/compaction/`, memory handlers, OpenAPI, SDK)

---

## Non-Negotiable Source Rule

Before implementing compaction behavior:

- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/compaction/types.go`
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/compaction/service.go`
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/handlers/compaction.go`
- [ ] Read the compaction section in `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/handlers/memory.go`
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/spec/swagger.yaml` for compaction / memory status / usage
- [ ] Read `/Users/zhangtiancheng/Documents/项目/agent/Memoh/packages/sdk/src/sdk.gen.ts` for the exact client surface

When Memoh source and README wording differ, source wins.

## Scope Boundary

This milestone intentionally does **not**:

- implement memory rebuild
- implement full reflective self-maintenance
- redesign the memory / self-maintenance product pages
- treat notebook as compaction input
- fully complete Mem0 provider parity

This milestone is specifically about compaction, logs, and minimal status/usage observability.

## File Structure And Ownership

### Backend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/compaction/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/compaction/store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/compaction/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/compaction.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_router.py`

### Backend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/builtin_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`

### Frontend files to create or modify

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/compaction/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/compaction/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/compaction/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

## Task 1: Lock Compaction Contract In Failing Tests

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_router.py`

- [ ] **Step 1: Write a failing compaction store test**

```python
def test_compaction_store_round_trips_logs(tmp_path):
    from nion.compaction.store import CompactionStore

    store = CompactionStore(tmp_path / "telemetry.sqlite3")
    store.append_log(status="succeeded", summary="Compacted memory", message_count=3)

    logs = store.list_logs(limit=10, offset=0)

    assert len(logs) == 1
    assert logs[0].summary == "Compacted memory"
```

- [ ] **Step 2: Write a failing compaction service test**

```python
def test_compaction_service_compacts_memory_payload(tmp_path):
    from nion.compaction.service import CompactionService

    service = CompactionService(base_dir=tmp_path)
    result = service.compact(ratio=0.8, decay_days=0)

    assert "status" in result
    assert "summary" in result
```

- [ ] **Step 3: Write a failing router test**

```python
def test_compaction_router_exposes_compact_logs_status_and_usage(monkeypatch, tmp_path):
    from fastapi.testclient import TestClient
    from app.daemon.app import create_app
    from nion.config.paths import reset_paths

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        compact_response = client.post("/api/memory/compact", json={"ratio": 0.8})
        logs_response = client.get("/api/memory/compact/logs")
        status_response = client.get("/api/memory/status")
        usage_response = client.get("/api/memory/usage")

    assert compact_response.status_code == 200
    assert logs_response.status_code == 200
    assert status_response.status_code == 200
    assert usage_response.status_code == 200
```

- [ ] **Step 4: Run tests to verify RED**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_compaction_store.py \
  tests/test_compaction_service.py \
  tests/test_compaction_router.py -q
```

Expected:
- tests fail because compaction modules and routes do not exist yet

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_compaction_store.py backend/tests/test_compaction_service.py backend/tests/test_compaction_router.py
git commit -m "test: lock compaction contract"
```

## Task 2: Implement Compaction Models, Store, And Service

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/compaction/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/compaction/store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/compaction/service.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_store.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_service.py`

- [ ] **Step 1: Implement compaction models**

Required shapes:

- `CompactionLog`
- `CompactionListLogsResponse`
- `CompactionResult`
- `MemoryUsageResponse`

Fields should borrow Memoh's structure where relevant:

- status
- summary
- message_count or compacted_fact_count equivalent
- started_at
- completed_at
- usage
- model_id or source marker if available

- [ ] **Step 2: Implement SQLite-backed compaction store**

The store must support:

- append log
- list logs
- delete logs

- [ ] **Step 3: Implement compaction service**

The first version should:

- read current structured memory
- deduplicate exact or near-exact facts conservatively
- preserve summaries
- support `ratio`
- accept `decay_days` but keep first implementation conservative if decay logic is minimal
- write a compaction log
- return a structured result

Implementation rule:

- do not compact notebook content
- do not silently delete all low-confidence memory
- prefer conservative compaction over aggressive pruning

- [ ] **Step 4: Run backend compaction tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_compaction_store.py \
  tests/test_compaction_service.py -q
```

Expected:
- pass

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/compaction/models.py backend/packages/harness/nion/compaction/store.py backend/packages/harness/nion/compaction/service.py backend/tests/test_compaction_store.py backend/tests/test_compaction_service.py
git commit -m "feat: add compaction service primitives"
```

## Task 3: Wire Compaction Into Memory Runtime And Heartbeat Backbone

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/heartbeat/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/builtin_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`

- [ ] **Step 1: Add compaction hook to memory runtime**

At minimum expose:

- `compact_memory(...)`
- `memory_status(...)`
- `memory_usage(...)`

through Memory OS service or a clearly related runtime service.

- [ ] **Step 2: Integrate compaction with heartbeat**

Heartbeat must be able to trigger a maintenance compaction cycle.

For M2:

- manual compaction entry remains required
- heartbeat-triggered compaction may be conservative and gated

- [ ] **Step 3: Decide provider behavior explicitly**

Use these defaults:

- built-in: supported
- openviking: supported through provider-aware adapter or compatibility path
- mem0: unsupported for now, return explicit unsupported response rather than pretending success

- [ ] **Step 4: Run regression tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_heartbeat_store.py \
  tests/test_heartbeat_service.py \
  tests/test_heartbeat_router.py \
  tests/test_compaction_service.py -q
```

Expected:
- pass

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/heartbeat/service.py backend/app/daemon/service.py backend/packages/harness/nion/memory_os/builtin_provider.py backend/packages/harness/nion/memory_os/openviking_provider.py backend/packages/harness/nion/memory_os/service.py
git commit -m "feat: wire compaction into memory runtime"
```

## Task 4: Expose Compaction, Status, And Usage API Surface

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/compaction.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_compaction_router.py`

- [ ] **Step 1: Add compaction logs router**

Expose:

- `GET /api/memory/compact/logs`
- `DELETE /api/memory/compact/logs`

- [ ] **Step 2: Extend memory router**

Expose:

- `POST /api/memory/compact`
- `GET /api/memory/usage`
- enrich `GET /api/memory/status`

- [ ] **Step 3: Wire router into runtime app**

Add compaction router into shared runtime app factory.

- [ ] **Step 4: Run compaction router tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_compaction_router.py -q
```

Expected:
- pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/gateway/routers/compaction.py backend/app/gateway/routers/memory.py backend/app/runtime/app_factory.py backend/tests/test_compaction_router.py
git commit -m "feat: expose compaction api surface"
```

## Task 5: Add Frontend Compaction Data Layer

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/compaction/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/compaction/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/compaction/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

- [ ] **Step 1: Implement compaction types**

Include:

- compaction result
- compaction log item
- compaction logs response
- memory usage response

- [ ] **Step 2: Implement API calls**

Include:

- `runMemoryCompaction()`
- `loadCompactionLogs()`
- `clearCompactionLogs()`
- `loadMemoryUsage()`

- [ ] **Step 3: Implement hooks**

Include:

- `useRunMemoryCompaction()`
- `useCompactionLogs()`
- `useClearCompactionLogs()`
- `useMemoryUsage()`

- [ ] **Step 4: Add i18n copy**

At minimum:

- compact
- compaction logs
- usage
- memory size / count
- supported / unsupported

- [ ] **Step 5: Run frontend focused verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/config/backend-base-url.test.ts
```

Expected:
- desktop backend fallback tests still pass

- [ ] **Step 6: Commit**

```bash
git add frontend/src/core/compaction/types.ts frontend/src/core/compaction/api.ts frontend/src/core/compaction/hooks.ts frontend/src/core/memory/api.ts frontend/src/core/memory/hooks.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts
git commit -m "feat: add compaction frontend data layer"
```

## Task 6: Milestone Verification And Docs Update

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

- [ ] **Step 1: Update parity baseline**

Mark compaction-related rows forward where implemented:

- memory compact
- heartbeat integration
- memory status
- memory usage

- [ ] **Step 2: Update roadmap evidence**

Record M2 evidence and note remaining gaps for M3 rebuild.

- [ ] **Step 3: Update test guide**

Document:

- compaction api tests
- memory usage checks
- desktop-dev smoke path

- [ ] **Step 4: Run full M2 targeted verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_heartbeat_store.py \
  tests/test_heartbeat_service.py \
  tests/test_heartbeat_router.py \
  tests/test_compaction_store.py \
  tests/test_compaction_service.py \
  tests/test_compaction_router.py -q

cd /Users/zhangtiancheng/Documents/项目/agent/nion && make desktop-dev
```

Then verify:

- `POST /api/memory/compact`
- `GET /api/memory/compact/logs`
- `GET /api/memory/status`
- `GET /api/memory/usage`

Expected:
- APIs reachable from desktop runtime
- compact run succeeds

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md docs/test/05-settings-config-center/README.md
git commit -m "docs: record compaction milestone progress"
```

## Spec Coverage Check

This milestone covers:

- compaction runtime
- compaction logs
- compaction api
- memory usage / status minimum support
- heartbeat-triggered compaction path

This milestone intentionally does not cover:

- rebuild
- full reflective maintenance
- notebook/product IA redesign
- full provider parity
