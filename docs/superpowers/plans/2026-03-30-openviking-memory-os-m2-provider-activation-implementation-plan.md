# OpenViking Memory OS M2 Provider Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn OpenViking into a real Memory OS provider family with `embedded` and `remote` modes so notebook, runtime memory, and AutoDream-related domains can flow through a unified OpenViking provider path.

**Architecture:** Build an `OpenVikingMemoryProvider` that plugs into the existing Memory OS foundation and can resolve either an embedded local backend or a remote HTTP-backed backend. Keep local canonical ownership rules intact, but route notebook-aware retrieval, user/agent memory storage, and AutoDream journal-facing provider operations through OpenViking domain adapters. Do not redesign the memory UI in this milestone; focus on provider activation and a stable API/capability surface.

**Tech Stack:** FastAPI, Pydantic, embedded OpenViking stores, Python provider adapters, optional HTTP client for remote mode, React 19, TypeScript, TanStack Query, pytest, node:test, ruff

---

## Scope Boundary

This milestone intentionally does **not**:

- redesign the memory page into the final Memory Console
- fully formalize identity and soul canonical artifacts
- introduce heartbeat
- require Mem0 to become a runtime-capable provider
- remove Built-in as the active fallback provider

This milestone only activates the OpenViking provider family as a genuine provider implementation.

## File Structure And Ownership

### Backend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_remote_client.py`
  - Remote mode transport adapter for OpenViking provider operations.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_models.py`
  - OpenViking provider config, capability, and domain-mapping models.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_openviking_provider.py`
  - Covers embedded and remote OpenViking provider behavior.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_openviking_router.py`
  - Covers provider state/config exposure relevant to OpenViking activation.

### Backend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
  - Replace family stub with a runtime-capable provider implementation.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/providers.py`
  - Add provider instance config shape for OpenViking `embedded` and `remote` modes.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/contracts.py`
  - Extend capability surface for native/adapted/mirrored support markers where needed.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`
  - Resolve OpenViking provider instances from active binding and expose capability/status helpers.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_os.py`
  - Add provider state details and mode-sensitive status output.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/openviking.py`
  - Align embedded OpenViking routes with the new provider-facing status model where needed.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-30-openviking-memory-os-milestone-checklist.md`

### Frontend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/openviking-mode.ts`
  - Frontend helpers for embedded/remote OpenViking mode presentation and payload shaping.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/openviking-mode.test.ts`

### Frontend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/types.ts`
  - Add OpenViking mode-aware provider config typing.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/api.ts`
  - Support richer provider state payloads needed by OpenViking activation.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
  - Show OpenViking embedded/remote configuration and status.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

## Task 1: Lock OpenViking Provider Config And Mode Semantics In Tests

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_openviking_provider.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_models.py`

- [ ] **Step 1: Write the failing test for embedded mode config resolution**

```python
from nion.memory_os.openviking_models import OpenVikingProviderConfig


def test_openviking_provider_config_accepts_embedded_mode():
    config = OpenVikingProviderConfig(mode="embedded")

    assert config.mode == "embedded"
    assert config.base_url is None
```

- [ ] **Step 2: Write the failing test for remote mode config resolution**

```python
def test_openviking_provider_config_requires_base_url_for_remote_mode():
    config = OpenVikingProviderConfig(mode="remote", base_url="https://memory.example.com")

    assert config.mode == "remote"
    assert config.base_url == "https://memory.example.com"
```

- [ ] **Step 3: Run the failing config tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_openviking_provider.py -q
```

Expected:
- failure because `openviking_models.py` and the config model do not exist yet

- [ ] **Step 4: Implement the minimal mode-aware OpenViking provider config model**

```python
class OpenVikingProviderConfig(BaseModel):
    mode: Literal["embedded", "remote"]
    base_url: str | None = None
    api_key: str | None = None
```

- [ ] **Step 5: Run the config tests again**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_openviking_provider.py -q
```

Expected:
- the config tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/memory_os/openviking_models.py backend/tests/test_memory_os_openviking_provider.py
git commit -m "test: lock openviking provider mode contract"
```

## Task 2: Activate Embedded OpenViking As A Provider

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`

- [ ] **Step 1: Write the failing test for embedded provider memory read**

```python
from nion.memory_os.openviking_provider import OpenVikingMemoryProvider


def test_openviking_memory_provider_embedded_mode_reads_memory_payload(tmp_path):
    provider = OpenVikingMemoryProvider(
        base_dir=tmp_path,
        config={"mode": "embedded"},
    )

    payload = provider.get_memory()

    assert payload["version"] == "1.0"
    assert "user" in payload
```

- [ ] **Step 2: Write the failing test for embedded provider AutoDream domain support**

```python
def test_openviking_memory_provider_embedded_mode_reports_autodream_domain():
    provider = OpenVikingMemoryProvider(config={"mode": "embedded"})

    assert "autodream_journal" in provider.supported_domains()
```

- [ ] **Step 3: Implement the minimal embedded provider bridge**

The provider should:

- reuse embedded OpenViking local paths
- expose a memory payload shape compatible with the current runtime contract
- declare notebook, user_memory, agent_memory, and autodream_journal support

- [ ] **Step 4: Run the targeted embedded provider tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_openviking_provider.py -q
```

Expected:
- embedded provider tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/memory_os/openviking_provider.py backend/packages/harness/nion/memory_os/service.py backend/tests/test_memory_os_openviking_provider.py
git commit -m "feat: activate embedded openviking provider"
```

## Task 3: Add Remote OpenViking Transport

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_remote_client.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_openviking_provider.py`

- [ ] **Step 1: Write the failing remote-mode test**

```python
def test_openviking_memory_provider_remote_mode_uses_base_url(monkeypatch):
    calls = {"base_url": None}

    class FakeRemoteClient:
        def __init__(self, *, base_url, api_key=None):
            calls["base_url"] = base_url

        def get_memory(self):
            return {"version": "1.0", "facts": []}

    monkeypatch.setattr(
        "nion.memory_os.openviking_provider.OpenVikingRemoteClient",
        FakeRemoteClient,
    )

    provider = OpenVikingMemoryProvider(
        config={"mode": "remote", "base_url": "https://memory.example.com"},
    )
    provider.get_memory()

    assert calls["base_url"] == "https://memory.example.com"
```

- [ ] **Step 2: Implement the minimal remote client**

The first version only needs:

- constructor with `base_url` and `api_key`
- `get_memory()`
- `status()`

It can be minimal and conservative.

- [ ] **Step 3: Run the targeted OpenViking provider tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_openviking_provider.py -q
```

Expected:
- both embedded and remote provider tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/packages/harness/nion/memory_os/openviking_remote_client.py backend/packages/harness/nion/memory_os/openviking_provider.py backend/tests/test_memory_os_openviking_provider.py
git commit -m "feat: add remote openviking transport bridge"
```

## Task 4: Expose OpenViking Provider Status In Memory OS API

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_os_openviking_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_os.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/service.py`

- [ ] **Step 1: Write the failing router test for OpenViking provider mode in state**

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_memory_os_router_returns_openviking_mode_details(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        client.put(
            "/api/memory-os/providers/state",
            json={
                "active_provider_family": "openviking",
                "active_provider_id": "ov-embedded",
            },
        )

        response = client.get("/api/memory-os/providers/state")

    assert response.status_code == 200
    assert "providers" in response.json()
```

- [ ] **Step 2: Extend provider state payload with config details**

Return enough state for frontend to know:

- provider family
- provider id
- provider config including `mode`
- status surface if available

- [ ] **Step 3: Run the router tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_router.py tests/test_memory_os_openviking_router.py -q
```

Expected:
- router tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/app/gateway/routers/memory_os.py backend/packages/harness/nion/memory_os/service.py backend/tests/test_memory_os_openviking_router.py
git commit -m "feat: expose openviking provider state details"
```

## Task 5: Frontend OpenViking Mode And Status Presentation

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/openviking-mode.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/openviking-mode.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-os/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

- [ ] **Step 1: Write the failing frontend mode helper test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { describeOpenVikingMode } from "./openviking-mode";

void test("describeOpenVikingMode formats embedded and remote labels", () => {
  assert.equal(describeOpenVikingMode({ mode: "embedded" }), "Embedded OpenViking");
  assert.equal(
    describeOpenVikingMode({ mode: "remote", base_url: "https://memory.example.com" }),
    "Remote OpenViking",
  );
});
```

- [ ] **Step 2: Extend provider card contract test**

Require the card to mention:

- active mode
- remote vs embedded
- status copy

- [ ] **Step 3: Implement mode helper and update the card**

Make the card display:

- OpenViking mode
- remote base URL if remote
- embedded/local note if embedded

- [ ] **Step 4: Run frontend targeted tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/memory-os/api.test.ts src/core/memory-os/openviking-mode.test.ts src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts
```

Expected:
- all targeted frontend tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/memory-os/openviking-mode.ts frontend/src/core/memory-os/openviking-mode.test.ts frontend/src/core/memory-os/types.ts frontend/src/core/memory-os/api.ts frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/types.ts
git commit -m "feat: surface openviking provider modes in settings"
```

## Task 6: Docs And Milestone Tracking

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/05-settings-config-center/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-03-30-openviking-memory-os-milestone-checklist.md`

- [ ] **Step 1: Update docs to describe OpenViking provider activation**

Document:

- OpenViking is now a real provider family
- `embedded` and `remote` modes exist
- this milestone activates provider plumbing, not the final Memory Console redesign

- [ ] **Step 2: Update the milestone checklist**

Mark:

- M1 complete
- M2 in progress
- add current verification evidence for embedded/remote activation

- [ ] **Step 3: Run the full M2 targeted verification**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_openviking_provider.py tests/test_memory_os_openviking_router.py tests/test_memory_os_router.py tests/test_openviking_router.py tests/test_autodream_router.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run ruff check app/gateway/routers/memory_os.py packages/harness/nion/memory_os/openviking_provider.py packages/harness/nion/memory_os/openviking_remote_client.py packages/harness/nion/memory_os/openviking_models.py
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/memory-os/api.test.ts src/core/memory-os/openviking-mode.test.ts src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts
```

Expected:
- M2-targeted backend and frontend tests pass
- lint passes

- [ ] **Step 4: Commit**

```bash
git add backend/README.md backend/CLAUDE.md docs/test/05-settings-config-center/README.md docs/superpowers/plans/2026-03-30-openviking-memory-os-milestone-checklist.md
git commit -m "docs: record openviking provider activation"
```

## Spec Coverage Check

This milestone covers:

- OpenViking as an actual provider implementation
- embedded and remote deployment modes
- provider-facing mode/status exposure
- the minimum frontend surface needed to understand the mode distinction

This milestone intentionally does not yet cover:

- Memory Console redesign
- identity/soul canonical artifacts
- full notebook canonical sync policy
- heartbeat and self-evolution
