# Legacy Memory Revert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Nion 彻底回退到 legacy `memory.json` 记忆系统，并删除当前记忆/维护/provider 新架构的全部运行时与产品面。

**Architecture:** 先用旧版本已经验证过的 legacy `/api/memory` 主链路替换当前 `MemoryOSService` 驱动的 memory router，再逐步删除 `memory-os`、`autodream`、`self-maintenance`、`heartbeat`、`compaction`、`rebuild` 的后端接线、前端数据层、桌面路由和相关文档测试。实施顺序严格遵守“先恢复旧主链路，再删除新主链路”，确保任意时刻系统都有可工作的 memory 基础面。

**Tech Stack:** FastAPI, Pydantic, Electron, Next.js/React, `memory.json`, pytest, node:test, pnpm typecheck, make desktop-dev

---

## File Map

### Restore / Modify

- Modify: `backend/app/gateway/routers/memory.py`
- Modify: `backend/app/runtime/app_factory.py`
- Modify: `backend/app/daemon/service.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-page.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-chat-list.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `frontend/CLAUDE.md`
- Modify: `docs/test/README.md`

### Delete

- Delete: `backend/app/gateway/routers/memory_os.py`
- Delete: `backend/app/gateway/routers/autodream.py`
- Delete: `backend/app/gateway/routers/self_maintenance.py`
- Delete: `backend/app/gateway/routers/heartbeat.py`
- Delete: `backend/app/gateway/routers/compaction.py`
- Delete: `backend/app/gateway/routers/rebuild.py`
- Delete: `backend/packages/harness/nion/memory_os/`
- Delete: `backend/packages/harness/nion/self_maintenance/`
- Delete: `backend/packages/harness/nion/heartbeat/`
- Delete: `backend/packages/harness/nion/compaction/`
- Delete: `backend/packages/harness/nion/rebuild/`
- Delete: `backend/packages/harness/nion/openviking/autodream_models.py`
- Delete: `backend/packages/harness/nion/openviking/autodream_scheduler.py`
- Delete: `backend/packages/harness/nion/openviking/autodream_policy.py`
- Delete: `backend/packages/harness/nion/openviking/autodream_store.py`
- Delete: `backend/packages/harness/nion/openviking/autodream_signals.py`
- Delete: `backend/packages/harness/nion/openviking/autodream_service.py`
- Delete: `frontend/src/core/memory-os/`
- Delete: `frontend/src/core/self-maintenance/`
- Delete: `frontend/src/core/heartbeat/`
- Delete: `frontend/src/core/autodream/`
- Delete: `frontend/src/core/compaction/`
- Delete: `frontend/src/core/rebuild/`
- Delete: `frontend/src/components/workspace/self-maintenance/`
- Delete: `frontend/src/app/workspace/self-maintenance/page.tsx`
- Delete: `frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`

### Tests To Update / Remove

- Modify: `backend/tests/test_memory_router.py`
- Modify: `backend/tests/test_local_daemon_api.py`
- Modify: `desktop/tests/workspace-contract.test.mjs`
- Modify: `frontend/src/components/workspace/memory/memory-page.contract.test.ts`
- Delete: `backend/tests/test_memory_os_*`
- Delete: `backend/tests/test_autodream_*`
- Delete: `backend/tests/test_self_maintenance_router.py`
- Delete: `backend/tests/test_heartbeat_service.py`
- Delete: `backend/tests/test_compaction_*`
- Delete: `backend/tests/test_rebuild_*`
- Delete: `frontend/src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts`
- Delete: `frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts`
- Delete: `frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts`
- Delete: `frontend/src/core/autodream/api.test.ts`
- Delete: `frontend/src/core/self-maintenance/api.test.ts`
- Delete: `frontend/src/core/memory-os/api.test.ts`

## Task 1: Lock Legacy Memory Router Behavior In Failing Tests

**Files:**
- Modify: `backend/tests/test_memory_router.py`
- Test: `backend/tests/test_memory_router.py`

- [ ] **Step 1: Write the failing tests**

```python
from app.runtime.app_factory import create_app
from fastapi.testclient import TestClient


def test_memory_router_status_has_no_runtime_block(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_BASE_DIR", str(tmp_path))
    app = create_app()
    with TestClient(app) as client:
        response = client.get("/api/memory/status")

    assert response.status_code == 200
    payload = response.json()
    assert "config" in payload
    assert "data" in payload
    assert "runtime" not in payload


def test_memory_router_does_not_register_memory_os_or_maintenance_routes():
    app = create_app()
    routes = {route.path for route in app.routes}

    assert "/api/memory" in routes
    assert "/api/memory/config" in routes
    assert "/api/memory/status" in routes
    assert "/api/memory/reload" in routes

    assert "/api/memory-os/providers/families" not in routes
    assert "/api/autodream/run" not in routes
    assert "/api/self-maintenance/run" not in routes
    assert "/api/heartbeat/status" not in routes
    assert "/api/memory/compact" not in routes
    assert "/api/memory/rebuild" not in routes
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_router.py -q
```

Expected:
```text
FAIL ... "runtime" unexpectedly present
FAIL ... memory-os/autodream/self-maintenance/heartbeat/compact/rebuild routes still registered
```

- [ ] **Step 3: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert
git add backend/tests/test_memory_router.py
git commit -m "test: lock legacy memory router contract"
```

## Task 2: Restore Legacy `/api/memory` Router And Remove Runtime Registration

**Files:**
- Modify: `backend/app/gateway/routers/memory.py`
- Modify: `backend/app/runtime/app_factory.py`
- Modify: `backend/app/daemon/service.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Delete: `backend/app/gateway/routers/memory_os.py`
- Delete: `backend/app/gateway/routers/autodream.py`
- Delete: `backend/app/gateway/routers/self_maintenance.py`
- Delete: `backend/app/gateway/routers/heartbeat.py`
- Delete: `backend/app/gateway/routers/compaction.py`
- Delete: `backend/app/gateway/routers/rebuild.py`
- Test: `backend/tests/test_memory_router.py`

- [ ] **Step 1: Replace `MemoryOSService` usage with legacy updater functions**

Use the old memory router shape from commit `55ef25ad`:

```python
from nion.agents.memory.updater import (
    clear_memory_data,
    delete_memory_fact,
    get_memory_data,
    reload_memory_data,
)
from nion.config.memory_config import get_memory_config
```

And return:

```python
class MemoryStatusResponse(BaseModel):
    config: MemoryConfigResponse
    data: MemoryResponse
```

Remove:

```python
runtime: dict[str, object] = Field(default_factory=dict)
```

- [ ] **Step 2: Remove runtime router registration from `app_factory.py`**

Delete imports and `include_router` calls for:

```python
memory_os.router
autodream.router
self_maintenance.router
heartbeat.router
compaction.router
rebuild.router
```

Keep `memory.router`.

- [ ] **Step 3: Remove daemon-owned maintenance state from `service.py`**

Delete imports and fields related to:

```python
HeartbeatService
SelfMaintenanceScheduler
_heartbeat_task
autodream_status()
self_maintenance_status()
heartbeat_status()
record_autodream_session_completed()
record_self_maintenance_session_completed()
_heartbeat_monitor()
```

Keep client session heartbeat for daemon clients untouched. Do not touch:

```python
heartbeat_client()
```

- [ ] **Step 4: Remove thread completion hooks into self-maintenance**

In `backend/app/gateway/routers/threads.py`, delete daemon hook usage:

```python
daemon_service.record_self_maintenance_session_completed()
```

- [ ] **Step 5: Remove lead-agent dependency on `MemoryOSService`**

Replace any prompt assembly path that imports `MemoryOSService` with legacy memory reader functions, or remove dead dependency if memory injection already works through legacy updater/storage.

- [ ] **Step 6: Run test to verify it passes**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_router.py -q
```

Expected:
```text
2 passed
```

- [ ] **Step 7: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert
git add backend/app/gateway/routers/memory.py backend/app/runtime/app_factory.py backend/app/daemon/service.py backend/app/gateway/routers/threads.py backend/packages/harness/nion/agents/lead_agent/prompt.py
git add -u backend/app/gateway/routers
git commit -m "feat: restore legacy memory router flow"
```

## Task 3: Delete Backend New-Memory Runtime Packages And Their Tests

**Files:**
- Delete: `backend/packages/harness/nion/memory_os/`
- Delete: `backend/packages/harness/nion/self_maintenance/`
- Delete: `backend/packages/harness/nion/heartbeat/`
- Delete: `backend/packages/harness/nion/compaction/`
- Delete: `backend/packages/harness/nion/rebuild/`
- Delete: `backend/packages/harness/nion/openviking/autodream_*`
- Delete: `backend/tests/test_memory_os_*`
- Delete: `backend/tests/test_autodream_*`
- Delete: `backend/tests/test_self_maintenance_router.py`
- Delete: `backend/tests/test_heartbeat_service.py`
- Delete: `backend/tests/test_compaction_*`
- Delete: `backend/tests/test_rebuild_*`
- Test: `backend/tests/test_local_daemon_api.py`

- [ ] **Step 1: Write the failing smoke assertion**

Append to `backend/tests/test_local_daemon_api.py`:

```python
def test_local_daemon_api_keeps_memory_and_notebook_without_new_memory_surfaces(client):
    memory = client.get("/api/memory")
    notebook = client.get("/api/notebook/tree")
    memory_os = client.get("/api/memory-os/providers/families")
    maintenance = client.get("/api/self-maintenance/status")

    assert memory.status_code == 200
    assert notebook.status_code in {200, 204}
    assert memory_os.status_code == 404
    assert maintenance.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/backend && UV_LINK_MODE=copy uv run pytest tests/test_local_daemon_api.py -q
```

Expected:
```text
FAIL because memory-os or self-maintenance endpoint still resolves
```

- [ ] **Step 3: Delete backend packages and obsolete tests**

Delete only the files listed in this task. Do not delete notebook/openviking notebook ingest files.

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/backend && UV_LINK_MODE=copy uv run pytest tests/test_local_daemon_api.py tests/test_memory_router.py -q
```

Expected:
```text
all passed
```

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert
git add backend/tests/test_local_daemon_api.py
git add -u backend/packages/harness/nion backend/tests
git commit -m "refactor: remove new memory runtime packages"
```

## Task 4: Remove Self-Maintenance / Provider Surface From Desktop Navigation

**Files:**
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Modify: `desktop/tests/workspace-contract.test.mjs`
- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-chat-list.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`

- [ ] **Step 1: Write the failing desktop route contract**

Update `desktop/tests/workspace-contract.test.mjs` expectation to assert absence:

```javascript
assert.doesNotMatch(source, /path="\/workspace\/self-maintenance"/);
```

Update the title to:

```javascript
test("desktop renderer wires notebook and memory routes without self-maintenance", () => {
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/desktop && node --test tests/workspace-contract.test.mjs
```

Expected:
```text
FAIL because self-maintenance route still exists
```

- [ ] **Step 3: Remove self-maintenance route helpers and navigation references**

Delete:

```typescript
export function pathOfSelfMaintenance() {
  return "/workspace/self-maintenance";
}
```

Remove all imports/usages in:

- `workspace-nav-menu.tsx`
- `workspace-nav-chat-list.tsx`
- `command-palette.tsx`
- `renderer-app.tsx`

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/desktop && node --test tests/workspace-contract.test.mjs
```

Expected:
```text
PASS
```

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert
git add desktop/src/renderer/renderer-app.tsx desktop/tests/workspace-contract.test.mjs frontend/src/core/navigation/desktop-routes.ts frontend/src/components/workspace/workspace-nav-menu.tsx frontend/src/components/workspace/workspace-nav-chat-list.tsx frontend/src/components/workspace/command-palette.tsx frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts
git commit -m "feat: remove self-maintenance workspace entry"
```

## Task 5: Restore Legacy Memory UI And Delete Provider / Maintenance Frontend Layers

**Files:**
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-page.tsx`
- Delete: `frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
- Delete: `frontend/src/components/workspace/self-maintenance/`
- Delete: `frontend/src/app/workspace/self-maintenance/page.tsx`
- Delete: `frontend/src/core/memory-os/`
- Delete: `frontend/src/core/self-maintenance/`
- Delete: `frontend/src/core/heartbeat/`
- Delete: `frontend/src/core/autodream/`
- Delete: `frontend/src/core/compaction/`
- Delete: `frontend/src/core/rebuild/`
- Modify: `frontend/src/components/workspace/memory/memory-page.contract.test.ts`
- Delete: `frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts`
- Delete: `frontend/src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts`
- Delete: `frontend/src/components/workspace/self-maintenance/self-maintenance-page.contract.test.ts`
- Delete: `frontend/src/core/autodream/api.test.ts`
- Delete: `frontend/src/core/self-maintenance/api.test.ts`
- Delete: `frontend/src/core/memory-os/api.test.ts`

- [ ] **Step 1: Write the failing frontend contract**

Update `frontend/src/components/workspace/memory/memory-page.contract.test.ts`:

```typescript
assert.doesNotMatch(source, /t\\.settings\\.compaction\\.title/);
assert.doesNotMatch(source, /t\\.settings\\.rebuild\\.title/);
assert.doesNotMatch(source, /useRunMemoryCompaction/);
assert.doesNotMatch(source, /useRunMemoryRebuild/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/frontend && node --test src/components/workspace/memory/memory-page.contract.test.ts
```

Expected:
```text
FAIL because compaction/rebuild references still exist
```

- [ ] **Step 3: Replace settings memory page with legacy memory view**

Use the pre-`Memory OS` memory settings page from older code as the reference shape:
- show memory summaries and facts
- keep clear memory / delete fact behaviors
- remove provider foundation, AutoDream, OpenViking inspection, self-maintenance links

- [ ] **Step 4: Simplify memory workspace page**

Remove:
- compaction block
- rebuild block
- provider/runtime/capability copy

Keep:
- memory summary display
- facts listing
- local in-page search over structured memory if already legacy-safe

- [ ] **Step 5: Delete frontend data layers and pages listed in this task**

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/frontend && node --test src/components/workspace/memory/memory-page.contract.test.ts src/components/workspace/settings/memory-settings-page.config.test.ts
```

Expected:
```text
PASS
```

- [ ] **Step 7: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert
git add frontend/src/components/workspace/settings/memory-settings-page.tsx frontend/src/components/workspace/memory/memory-page.tsx frontend/src/components/workspace/memory/memory-page.contract.test.ts frontend/src/components/workspace/settings/memory-settings-page.config.test.ts
git add -u frontend/src/components/workspace/settings frontend/src/components/workspace/self-maintenance frontend/src/app/workspace/self-maintenance frontend/src/core
git commit -m "feat: restore legacy memory frontend surface"
```

## Task 6: Clean I18n, Docs, And Regression Verification

**Files:**
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `frontend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Remove i18n keys tied only to deleted memory features**

Delete copy blocks for:
- `heartbeat`
- `compaction`
- `rebuild`
- `settings.memory.autodream`
- `workspaceSurfaces.selfMaintenance`
- provider foundation descriptions that no longer render

- [ ] **Step 2: Run frontend typecheck**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/frontend && pnpm typecheck
```

Expected:
```text
TypeScript passes with removed memory-maintenance symbols cleaned up
```

- [ ] **Step 3: Update backend/frontend/docs to describe legacy memory only**

Replace any mention of:
- Memory OS
- AutoDream
- self-maintenance
- compaction
- rebuild

with legacy memory wording where relevant.

- [ ] **Step 4: Run full targeted verification**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_router.py tests/test_local_daemon_api.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert/frontend && node --test src/components/workspace/memory/memory-page.contract.test.ts src/components/workspace/settings/memory-settings-page.config.test.ts && pnpm typecheck
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert && make desktop-dev
```

Expected:
```text
backend targeted tests pass
frontend targeted tests pass
frontend typecheck passes
desktop starts and memory/notebook routes remain usable
```

- [ ] **Step 5: Commit**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex/legacy-memory-revert
git add frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts backend/README.md backend/CLAUDE.md frontend/CLAUDE.md docs/test/README.md
git commit -m "docs: finalize legacy memory rollback"
```

## Self-Review

- [ ] Plan only preserves `Notebook` and legacy memory behavior, without reintroducing new memory runtime concepts
- [ ] Plan deletes new memory runtime packages instead of merely hiding them
- [ ] Plan includes TDD red/green steps before each implementation slice
- [ ] Plan includes desktop verification instead of backend/frontend-only verification
- [ ] Plan avoids touching unrelated modules such as `Projects`, bridges, and model management
