# Memory Soul Post-M4 Cutover And Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the post-M4 transition by moving remaining product surfaces off legacy compatibility facades, making canonical memory APIs first-class, and retiring obsolete internal bridge semantics without breaking current user-facing contracts during the cutover window.

**Architecture:** The dual-layer system is already built. This phase is about removing the remaining architectural dishonesty: stop treating compatibility payload builders as if they were long-term architecture, introduce canonical route contracts for user/history/facts/growth summary surfaces, then keep old routes as thin adapters until every consumer has been migrated. The delivery is split into independent but ordered tasks so every cutover is testable and reversible.

**Tech Stack:** Python 3.12, FastAPI, SQLite, React 19, TypeScript, TanStack Query, node:test contract tests, `uv run pytest`, `pnpm typecheck`, `pnpm test:contracts`

---

## File Structure

### New Backend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_canonical.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_canonical_router.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_growth_cutover_router.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_client_cutover.py`

### Modified Backend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/__init__.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_growth.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/compat.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_growth_compat_adapter.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_client.py`

### New Frontend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-canonical/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-canonical/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-canonical/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth-v2/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth-v2/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth-v2/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-cutover.contract.test.ts`

### Modified Frontend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-history-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-facts-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-growth-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-proposal-list.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-facts-page.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-history-page.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-growth-panel.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-proposal-list.contract.test.ts`

### Modified Docs

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md`

## Task 1: Introduce Canonical Memory Surface Router And Keep `/api/memory` As Thin Facade

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_canonical.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_canonical_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/__init__.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/compat.py`

- [ ] **Step 1: Write failing router tests for canonical user/history/facts surfaces**

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.memory_os.repository import MemoryOSRepository


def test_memory_canonical_router_exposes_user_history_and_facts(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_node(
        {
            "memory_id": "mem:user:work",
            "canonical_key": "user_model:workContext",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "user_model",
            "status": "active",
            "summary": "负责财务 BP",
            "created_at": "2026-04-09T00:00:00Z",
            "updated_at": "2026-04-09T00:00:00Z",
            "metadata": {"domain": "user_model", "subtype": "workContext"},
        }
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory-canonical/user")

    assert response.status_code == 200
    assert response.json()["workContext"]["summary"] == "负责财务 BP"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_canonical_router.py -q
```

Expected: FAIL because `/api/memory-canonical/*` does not exist

- [ ] **Step 3: Implement canonical memory router**

```python
router = APIRouter(prefix="/api/memory-canonical", tags=["memory"])


@router.get("/user")
async def get_memory_user_surface():
    ...


@router.get("/history")
async def get_memory_history_surface():
    ...


@router.get("/facts")
async def get_memory_facts_surface():
    ...
```

Implementation requirements:

- move the projection logic that currently hides inside `build_legacy_memory_view()` into small reusable helpers
- keep `/api/memory` returning the old payload shape for now, but make it delegate to the canonical helper instead of owning logic
- register the new router in `app_factory.py`
- export the router module in `backend/app/gateway/routers/__init__.py`

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_canonical_router.py \
  tests/test_memory_router.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/app/gateway/routers/memory_canonical.py \
  backend/app/runtime/app_factory.py \
  backend/app/gateway/routers/__init__.py \
  backend/app/gateway/routers/memory.py \
  backend/packages/harness/nion/memory_os/compat.py \
  backend/tests/test_memory_canonical_router.py \
  backend/tests/test_memory_router.py
git commit -m "feat: add canonical memory router surfaces"
```

## Task 2: Cut User, History, And Facts Pages To Canonical APIs

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-canonical/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-canonical/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-canonical/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-history-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-facts-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-facts-page.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-history-page.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory/types.ts`

- [ ] **Step 1: Add failing contract tests proving pages no longer depend on the monolithic `/api/memory` shape**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory user page reads canonical user surface instead of generic useMemory()", async () => {
  const source = await readFile(new URL("./memory-user-page.tsx", import.meta.url), "utf8");
  assert.match(source, /useMemoryUserSurface/);
  assert.doesNotMatch(source, /useMemory\(\)/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-user-page.contract.test.ts \
  src/components/workspace/memory/memory-facts-page.contract.test.ts \
  src/components/workspace/memory/memory-history-page.contract.test.ts
```

Expected: FAIL because canonical hooks do not exist yet

- [ ] **Step 3: Implement canonical frontend memory core and page cutover**

```ts
export interface MemoryUserSurface {
  workContext: { summary: string; updatedAt: string; memoryId: string | null };
  personalContext: { summary: string; updatedAt: string; memoryId: string | null };
  topOfMind: { summary: string; updatedAt: string; memoryId: string | null };
}

export function useMemoryUserSurface() {
  return useQuery({
    queryKey: ["memory-canonical", "user"],
    queryFn: () => loadMemoryUserSurface(),
  });
}
```

Implementation requirements:

- user page should stop using `useMemory()` fallback summaries as its primary data source
- history page should read dedicated history payload, not the monolithic memory blob
- facts page should keep create/edit/delete/import/export/clear actions, but its list source should move to canonical facts payload
- keep `useMemory()` alive temporarily for surfaces that still need the old aggregate payload

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test:contracts -- \
  src/components/workspace/memory/memory-user-page.contract.test.ts \
  src/components/workspace/memory/memory-facts-page.contract.test.ts \
  src/components/workspace/memory/memory-history-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/core/memory-canonical/api.ts \
  frontend/src/core/memory-canonical/hooks.ts \
  frontend/src/core/memory-canonical/types.ts \
  frontend/src/core/memory/api.ts \
  frontend/src/core/memory/hooks.ts \
  frontend/src/core/memory/types.ts \
  frontend/src/components/workspace/memory/memory-user-page.tsx \
  frontend/src/components/workspace/memory/memory-facts-page.tsx \
  frontend/src/components/workspace/memory/memory-history-page.tsx \
  frontend/src/components/workspace/memory/memory-user-page.contract.test.ts \
  frontend/src/components/workspace/memory/memory-facts-page.contract.test.ts \
  frontend/src/components/workspace/memory/memory-history-page.contract.test.ts
git commit -m "refactor: cut memory pages to canonical surfaces"
```

## Task 3: Cut Growth And Soul Governance UI To Canonical V2 APIs

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth-v2/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth-v2/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth-v2/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-growth/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-growth-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-proposal-list.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-growth-panel.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-proposal-list.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-cutover.contract.test.ts`

- [ ] **Step 1: Add failing contract tests for growth/soul cutover**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory growth panel no longer treats /api/memory/growth as the canonical source of truth", async () => {
  const source = await readFile(new URL("./memory-growth-panel.tsx", import.meta.url), "utf8");
  assert.match(source, /useMemoryGrowthV2/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/memory-growth-panel.contract.test.ts \
  src/components/workspace/memory/soul-proposal-list.contract.test.ts \
  src/components/workspace/memory/memory-cutover.contract.test.ts
```

Expected: FAIL because v2 hooks do not exist yet

- [ ] **Step 3: Implement growth/soul frontend cutover**

```ts
export interface MemoryGrowthV2Response {
  learning: MemoryGrowthItem[];
  procedures: MemoryGrowthItem[];
  soulProposals: MemoryGrowthItem[];
  sourceMode: "canonical";
}
```

Implementation requirements:

- create explicit v2 growth API clients instead of overloading legacy naming forever
- keep old `/api/memory/growth*` calls available only as adapter-backed fallback while cutover happens
- move soul proposal accept/reject reads to canonical source naming while preserving current UI behavior
- update contract tests so they assert canonical hook usage, not legacy endpoint strings

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test:contracts -- \
  src/components/workspace/memory/memory-growth-panel.contract.test.ts \
  src/components/workspace/memory/soul-proposal-list.contract.test.ts \
  src/components/workspace/memory/memory-cutover.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/core/memory-growth-v2/api.ts \
  frontend/src/core/memory-growth-v2/hooks.ts \
  frontend/src/core/memory-growth-v2/types.ts \
  frontend/src/core/memory-growth/api.ts \
  frontend/src/core/memory-growth/hooks.ts \
  frontend/src/core/memory-growth/types.ts \
  frontend/src/core/soul/api.ts \
  frontend/src/components/workspace/memory/memory-growth-panel.tsx \
  frontend/src/components/workspace/memory/soul-proposal-list.tsx \
  frontend/src/components/workspace/memory/memory-growth-panel.contract.test.ts \
  frontend/src/components/workspace/memory/soul-proposal-list.contract.test.ts \
  frontend/src/components/workspace/memory/memory-cutover.contract.test.ts
git commit -m "refactor: cut growth and soul UI to canonical apis"
```

## Task 4: Retire Legacy Client And Router Semantics Behind Explicit Compatibility Boundaries

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_client_cutover.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_growth.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_client.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_growth_compat_adapter.py`

- [ ] **Step 1: Add failing tests proving the desktop client and legacy routes are now explicit adapters**

```python
from unittest.mock import patch


def test_client_get_memory_uses_canonical_memory_surface(client):
    with patch("nion.memory_os.compat.build_legacy_memory_view") as legacy_view, patch(
        "nion.memory_os.compat.build_canonical_memory_payload"
    ) as canonical_view:
        canonical_view.return_value = {"version": "2.0", "facts": []}
        client.get_memory()

    canonical_view.assert_called_once()
    legacy_view.assert_not_called()
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_client_cutover.py \
  tests/test_client.py -q
```

Expected: FAIL because canonical helper/client path does not exist yet

- [ ] **Step 3: Implement explicit compatibility boundary**

```python
def build_canonical_memory_payload(...):
    ...


def build_legacy_memory_view(...):
    canonical = build_canonical_memory_payload(...)
    return _project_canonical_payload_to_legacy_shape(canonical)
```

Implementation requirements:

- split canonical payload building from legacy payload projection inside `memory_os.compat`
- update `NionClient` to prefer canonical payload helpers where behavior allows
- leave `/api/memory` and `/api/memory/growth*` alive, but annotate them in code/comments/tests as compatibility facades rather than primary architecture
- do not delete external routes in this task

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_client_cutover.py \
  tests/test_client.py \
  tests/test_memory_growth_compat_adapter.py \
  tests/test_memory_router.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/compat.py \
  backend/packages/harness/nion/client.py \
  backend/app/gateway/routers/memory.py \
  backend/app/gateway/routers/memory_growth.py \
  backend/tests/test_memory_client_cutover.py \
  backend/tests/test_client.py \
  backend/tests/test_memory_growth_compat_adapter.py \
  backend/tests/test_memory_router.py
git commit -m "refactor: make legacy memory routes explicit adapters"
```

## Task 5: Final Verification And Roadmap Update For Post-M4 Cutover

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md`

- [ ] **Step 1: Run backend verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_canonical_router.py \
  tests/test_memory_growth_cutover_router.py \
  tests/test_memory_client_cutover.py \
  tests/test_memory_router.py \
  tests/test_memory_growth_compat_adapter.py \
  tests/test_client.py -q
```

Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test:contracts -- \
  src/components/workspace/memory/memory-user-page.contract.test.ts \
  src/components/workspace/memory/memory-facts-page.contract.test.ts \
  src/components/workspace/memory/memory-history-page.contract.test.ts \
  src/components/workspace/memory/memory-growth-panel.contract.test.ts \
  src/components/workspace/memory/soul-proposal-list.contract.test.ts \
  src/components/workspace/memory/memory-cutover.contract.test.ts && pnpm typecheck
```

Expected: PASS

- [ ] **Step 3: Update roadmap/spec**

Record:

- canonical memory routes now own user/history/facts/growth read surfaces
- old `/api/memory` and `/api/memory/growth*` are compatibility adapters, not architectural truth
- frontend canonical cutover is complete for all memory product pages
- remaining work, if any, is limited to eventual external route retirement timing rather than architecture build-out

- [ ] **Step 4: Commit**

```bash
git add \
  docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md \
  docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md
git commit -m "docs: record post-m4 canonical cutover checkpoint"
```
