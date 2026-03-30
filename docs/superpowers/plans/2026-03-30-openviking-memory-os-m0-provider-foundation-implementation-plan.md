# OpenViking Memory OS M0 Provider Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the provider foundation for Nion's Memory OS so provider families, provider instances, and the active memory binding are modeled and manageable without yet changing the runtime hot path.

**Architecture:** Add a backend Memory OS layer that defines the provider contract, provider registry, provider metadata/service, and active-provider binding. Expose a minimal API for listing provider families, managing configured provider instances, and reading/updating the active binding. On the frontend, add a provider-facing state layer and a minimal settings surface that can render this new information alongside the current memory page without rewriting the entire product flow yet.

**Tech Stack:** FastAPI, Pydantic, existing config-center patterns, SQLite-backed config store where appropriate, Python provider registry in `packages/harness`, React 19, TypeScript, TanStack Query, existing Nion i18n locale system, pytest, node:test

---

## Scope Boundary

This milestone intentionally does **not**:

- migrate runtime memory reads/writes away from legacy `memory` yet
- remove `/api/memory`
- replace the current memory settings page information architecture
- implement heartbeat
- implement identity or soul canonical artifacts
- require OpenViking provider CRUD to be fully operational against remote services

This milestone only introduces the provider foundation that later milestones will consume.

## File Structure And Ownership

### Backend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/contracts.py`
  - Provider contract definitions, domain enums, capability models, status models.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/providers.py`
  - Provider family metadata, provider instance models, binding models.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/registry.py`
  - Runtime registry for provider family adapters.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`
  - Service layer for listing provider families, configured instances, and binding state.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/config_state.py`
  - Config-center-compatible read/write helpers for provider instances and active binding.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/builtin_provider.py`
  - Built-in provider family stub implementing the provider contract surface for metadata and status.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/mem0_provider.py`
  - Mem0 provider family stub implementing provider metadata and config validation.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
  - OpenViking provider family stub including `embedded` vs `remote` mode metadata.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_os.py`
  - API surface for provider families, provider instances, and active binding.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_router.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_config_state.py`

### Backend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
  - Include the new router in shared runtime surfaces.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/app.py`
  - Add the new `memory-os` tag description.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/app_config.py`
  - Load and expose the new Memory OS config section if needed.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/memory_config.py`
  - Mark legacy file-backed memory config as legacy in comments and compatibility semantics without removing it yet.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md`

### Frontend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/api.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
  - Temporary provider foundation surface rendered inside current memory settings page.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts`

### Frontend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
  - Inject a temporary provider foundation section above the legacy memory cards.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`
  - Add Memory OS provider foundation coverage to the settings module test guide.

## Task 1: Lock Provider Contract Types In Backend Tests

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/contracts.py`

- [ ] **Step 1: Write the failing test for provider family listing**

```python
from nion.memory_os.service import MemoryOSService


def test_memory_os_service_lists_three_provider_families():
    service = MemoryOSService()

    families = service.list_provider_families()

    assert [family.family for family in families] == [
        "builtin",
        "mem0",
        "openviking",
    ]
```

- [ ] **Step 2: Write the failing test for domain coverage on every family**

```python
def test_every_provider_family_exposes_full_memory_os_domains():
    service = MemoryOSService()

    for family in service.list_provider_families():
        assert family.supported_domains == [
            "notebook",
            "user_memory",
            "agent_memory",
            "autodream_journal",
            "identity",
            "soul",
        ]
```

- [ ] **Step 3: Implement the minimal contracts and service stubs**

```python
from pydantic import BaseModel, Field


class ProviderFamilyMeta(BaseModel):
    family: str
    display_name: str
    supported_domains: list[str] = Field(default_factory=list)


class MemoryOSService:
    def list_provider_families(self) -> list[ProviderFamilyMeta]:
        return [
            ProviderFamilyMeta(
                family="builtin",
                display_name="Built-in",
                supported_domains=[
                    "notebook",
                    "user_memory",
                    "agent_memory",
                    "autodream_journal",
                    "identity",
                    "soul",
                ],
            ),
            ProviderFamilyMeta(
                family="mem0",
                display_name="Mem0",
                supported_domains=[
                    "notebook",
                    "user_memory",
                    "agent_memory",
                    "autodream_journal",
                    "identity",
                    "soul",
                ],
            ),
            ProviderFamilyMeta(
                family="openviking",
                display_name="OpenViking",
                supported_domains=[
                    "notebook",
                    "user_memory",
                    "agent_memory",
                    "autodream_journal",
                    "identity",
                    "soul",
                ],
            ),
        ]
```

- [ ] **Step 4: Run the targeted backend test**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_service.py -q
```

Expected:
- `2 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/memory_os/contracts.py backend/packages/harness/nion/memory_os/service.py backend/tests/test_memory_os_service.py
git commit -m "test: lock memory os provider family contract"
```

## Task 2: Add Provider Instance And Binding Config State

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/providers.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/config_state.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_config_state.py`

- [ ] **Step 1: Write the failing test for empty default binding**

```python
from nion.memory_os.config_state import load_memory_os_state


def test_load_memory_os_state_returns_default_builtin_binding_when_empty(tmp_path):
    state = load_memory_os_state(base_dir=tmp_path)

    assert state.active_provider_family == "builtin"
    assert state.active_provider_id is None
    assert state.providers == []
```

- [ ] **Step 2: Write the failing test for persisting provider instances**

```python
from nion.memory_os.config_state import load_memory_os_state, save_memory_os_state
from nion.memory_os.providers import MemoryOSState, ProviderInstanceConfig


def test_save_and_reload_memory_os_state_round_trips_provider_instances(tmp_path):
    save_memory_os_state(
        MemoryOSState(
            active_provider_family="openviking",
            active_provider_id="provider-1",
            providers=[
                ProviderInstanceConfig(
                    id="provider-1",
                    family="openviking",
                    name="Embedded OpenViking",
                    config={"mode": "embedded"},
                )
            ],
        ),
        base_dir=tmp_path,
    )

    reloaded = load_memory_os_state(base_dir=tmp_path)

    assert reloaded.active_provider_family == "openviking"
    assert reloaded.active_provider_id == "provider-1"
    assert reloaded.providers[0].config == {"mode": "embedded"}
```

- [ ] **Step 3: Implement the minimal state models and file-backed compatibility store**

```python
from pathlib import Path
from pydantic import BaseModel, Field


class ProviderInstanceConfig(BaseModel):
    id: str
    family: str
    name: str
    config: dict[str, object] = Field(default_factory=dict)


class MemoryOSState(BaseModel):
    active_provider_family: str = "builtin"
    active_provider_id: str | None = None
    providers: list[ProviderInstanceConfig] = Field(default_factory=list)


def _state_file(base_dir: Path) -> Path:
    return base_dir / "memory-os-state.json"
```

- [ ] **Step 4: Run the targeted backend tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_config_state.py -q
```

Expected:
- `2 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/memory_os/providers.py backend/packages/harness/nion/memory_os/config_state.py backend/tests/test_memory_os_config_state.py
git commit -m "feat: add memory os provider state storage"
```

## Task 3: Add Registry And Family Adapters

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/registry.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/builtin_provider.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/mem0_provider.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`

- [ ] **Step 1: Write the failing test for OpenViking deployment modes**

```python
from nion.memory_os.service import MemoryOSService


def test_openviking_family_exposes_embedded_and_remote_modes():
    family = next(
        item
        for item in MemoryOSService().list_provider_families()
        if item.family == "openviking"
    )

    assert family.supported_modes == ["embedded", "remote"]
```

- [ ] **Step 2: Write the failing test for family adapter registration**

```python
from nion.memory_os.registry import build_memory_os_registry


def test_registry_contains_builtin_mem0_and_openviking_families():
    registry = build_memory_os_registry()

    assert sorted(registry.keys()) == ["builtin", "mem0", "openviking"]
```

- [ ] **Step 3: Implement minimal family adapters and registry**

```python
def build_memory_os_registry():
    return {
        "builtin": BuiltinMemoryProviderFamily(),
        "mem0": Mem0MemoryProviderFamily(),
        "openviking": OpenVikingMemoryProviderFamily(),
    }
```

- [ ] **Step 4: Run the targeted backend test**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_service.py tests/test_memory_os_config_state.py -q
```

Expected:
- all tests still pass with the new mode and registry assertions

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/memory_os/registry.py backend/packages/harness/nion/memory_os/builtin_provider.py backend/packages/harness/nion/memory_os/mem0_provider.py backend/packages/harness/nion/memory_os/openviking_provider.py backend/packages/harness/nion/memory_os/service.py backend/tests/test_memory_os_service.py
git commit -m "feat: register memory os provider family adapters"
```

## Task 4: Expose Memory OS Backend API

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_os.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/runtime/app_factory.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/app.py`

- [ ] **Step 1: Write the failing router test for provider families**

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_memory_os_router_lists_provider_families():
    with TestClient(create_app()) as client:
        response = client.get("/api/memory-os/providers/families")

    assert response.status_code == 200
    payload = response.json()
    assert [item["family"] for item in payload["families"]] == [
        "builtin",
        "mem0",
        "openviking",
    ]
```

- [ ] **Step 2: Write the failing router test for active binding state**

```python
def test_memory_os_router_returns_active_binding_state():
    with TestClient(create_app()) as client:
        response = client.get("/api/memory-os/providers/state")

    assert response.status_code == 200
    assert response.json()["active_provider_family"] == "builtin"
```

- [ ] **Step 3: Implement the minimal router**

```python
router = APIRouter(prefix="/api/memory-os", tags=["memory-os"])


@router.get("/providers/families")
async def list_provider_families():
    service = MemoryOSService()
    return {"families": [item.model_dump() for item in service.list_provider_families()]}


@router.get("/providers/state")
async def get_provider_state():
    service = MemoryOSService()
    return service.get_state().model_dump()
```

- [ ] **Step 4: Register the router in shared runtime app creation**

Add the router to the shared include list and add a matching OpenAPI tag entry for `memory-os`.

- [ ] **Step 5: Run the targeted backend router tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_router.py -q
```

Expected:
- `2 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/app/gateway/routers/memory_os.py backend/app/runtime/app_factory.py backend/app/gateway/app.py backend/tests/test_memory_os_router.py
git commit -m "feat: expose memory os provider foundation api"
```

## Task 5: Add Frontend Memory OS Core Client

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/api.test.ts`

- [ ] **Step 1: Write the failing API contract test**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";

void test("memory os api loads provider families and state", async () => {
  const requests: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requests.push(String(input));
    return new Response(JSON.stringify({ families: [], active_provider_family: "builtin" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const { listMemoryProviderFamilies, getMemoryProviderState } = await import("./api");

  await listMemoryProviderFamilies();
  await getMemoryProviderState();

  assert.equal(requests[0].includes("/api/memory-os/providers/families"), true);
  assert.equal(requests[1].includes("/api/memory-os/providers/state"), true);
});
```

- [ ] **Step 2: Implement the minimal core API client**

```ts
export async function listMemoryProviderFamilies(): Promise<MemoryProviderFamiliesResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/memory-os/providers/families`);
  if (!response.ok) throw new Error(`Failed to load memory provider families (${response.status})`);
  return readJson<MemoryProviderFamiliesResponse>(response);
}
```

- [ ] **Step 3: Add TanStack hooks for the two read surfaces**

```ts
export function useMemoryProviderFamilies() {
  return useQuery({
    queryKey: ["memory-os", "provider-families"],
    queryFn: listMemoryProviderFamilies,
  });
}
```

- [ ] **Step 4: Run the targeted frontend test**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/memory-os/api.test.ts
```

Expected:
- `1 pass`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/memory-os/types.ts frontend/src/core/memory-os/api.ts frontend/src/core/memory-os/hooks.ts frontend/src/core/memory-os/api.test.ts
git commit -m "feat: add memory os frontend provider client"
```

## Task 6: Add Temporary Provider Foundation UI In Settings

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

- [ ] **Step 1: Write the failing contract test for provider foundation copy**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

void test("memory provider foundation card references provider families and openviking modes", async () => {
  const source = await readFile(
    new URL("./memory-provider-foundation-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Built-in|Mem0|OpenViking/);
  assert.match(source, /embedded|remote/i);
});
```

- [ ] **Step 2: Implement the minimal provider foundation card**

```tsx
export function MemoryProviderFoundationCard() {
  const families = useMemoryProviderFamilies();
  const state = useMemoryProviderState();

  return (
    <div className="rounded-xl border bg-background/80 p-5 shadow-sm">
      <h3 className="text-base font-medium">Memory Provider</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Choose the active memory backend that powers notebook, memory, AutoDream, identity, and soul.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Render the provider foundation card above the legacy memory cards**

Add `<MemoryProviderFoundationCard />` at the top of `MemorySettingsPage`, but do not remove existing legacy cards in this milestone.

- [ ] **Step 4: Run the targeted frontend contract test**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts
```

Expected:
- `1 pass`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts frontend/src/components/workspace/settings/memory-settings-page.tsx frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/types.ts
git commit -m "feat: surface memory os provider foundation in settings"
```

## Task 7: Documentation And Regression Closure

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`

- [ ] **Step 1: Update backend docs to mention Memory OS foundation**

Add concise sections describing:

- the new `memory-os` provider foundation API
- that `memory.json` is now legacy-boundary architecture and will be removed from runtime in later milestones
- that this milestone does not yet change hot-path runtime memory behavior

- [ ] **Step 2: Update the settings test guide**

Add Memory OS provider foundation coverage to the settings testing guide:

- provider family list
- OpenViking embedded/remote mode copy
- active provider state rendering

- [ ] **Step 3: Run full milestone verification**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_service.py tests/test_memory_os_config_state.py tests/test_memory_os_router.py tests/test_memory_router.py tests/test_openviking_router.py tests/test_autodream_router.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/memory-os/api.test.ts src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts src/components/workspace/settings/memory-settings-page.config.test.ts src/components/workspace/settings/memory-settings-page.openviking.contract.test.ts
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run ruff check app/gateway/routers/memory_os.py packages/harness/nion/memory_os
```

Expected:
- all new Memory OS foundation tests pass
- legacy memory/openviking/autodream contract tests continue to pass
- lint passes on touched backend files

- [ ] **Step 4: Commit**

```bash
git add backend/README.md backend/CLAUDE.md docs/test/05-settings-config-center/README.md
git commit -m "docs: record memory os provider foundation"
```

## Spec Coverage Check

This milestone covers the following parts of the Memory OS spec:

- provider contract foundation
- three provider families
- OpenViking embedded/remote mode metadata
- provider binding state
- initial provider-facing product surface

It intentionally does not yet cover:

- runtime migration off `memory.json`
- full Memory Console rewrite
- canonical asset synchronization
- heartbeat
- identity/soul runtime integration

Those are deferred to later milestone plans on purpose.
