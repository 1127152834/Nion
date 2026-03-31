# Memoh-Style Memory Self-Maintenance M6 Provider Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the largest remaining provider/runtime parity gaps by turning `mem0` from a metadata shell into a real runtime option, and by expanding provider status, capability, and usage surfaces so Nion's Memory OS looks and behaves closer to Memoh's provider backbone.

**Architecture:** M6 is a provider-runtime milestone, not another product-IA milestone. The user-facing shell added in M5 stays intact while this milestone deepens the provider layer underneath it. The work should treat provider parity as a capability matrix problem: every provider family should expose explicit support or non-support for memory CRUD, search, compact, rebuild, usage, and runtime status; `mem0` should become a true runtime provider rather than a `NotImplementedError` stub; and the frontend/provider APIs should expose that matrix without pretending unsupported features already work.

**Tech Stack:** FastAPI, Pydantic, provider-runtime abstractions under `backend/packages/harness/nion/memory_os`, existing compaction/rebuild/status APIs, React/TypeScript Memory OS client surfaces, pytest, node:test, Electron desktop runtime, Memoh reference sources (`internal/memory/adapters`, OpenAPI `/memory-providers`, SDK provider/status endpoints).

---

## Non-Negotiable Source Rule

Before implementing M6, read Memoh source and API references that define provider runtime behavior:

- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/cmd/agent/main.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/provider.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/builtin/builtin.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/mem0/mem0.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/adapters/openviking/` if present in this checkout, otherwise equivalent OpenViking adapter surface
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/handlers/memory.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/handlers/settings.go`
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/spec/swagger.yaml` provider / memory status / usage sections
- [ ] `/Users/zhangtiancheng/Documents/项目/agent/Memoh/packages/sdk/src/sdk.gen.ts`

When Memoh README wording and source behavior differ, source wins.

## Scope Boundary

This milestone intentionally does **not**:

- redesign Memory / Self-Maintenance / Notebook pages again
- move notebook resources into memory
- remove embedded OpenViking support
- add multi-bot, multi-user, or identity-sharing shells
- expand provider parity into project-domain business logic
- invent unsupported capabilities behind optimistic UI copy

This milestone is specifically about:

- provider runtime capability modeling
- `mem0` real runtime integration
- provider status / usage / health / capability surfaces
- backend API expansion for provider introspection
- frontend provider-state rendering updates

## File Structure And Ownership

### Backend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_mem0_provider.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_provider_status.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_provider_capabilities.py`

### Backend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/mem0_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/builtin_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/openviking_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/providers.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/contracts.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/registry.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/app/gateway/routers/memory_os.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_registry.py`

### Frontend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/memory-os/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/memory-os/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/memory-os/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/i18n/locales/types.ts`

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/docs/test/05-settings-config-center/README.md`

## Task 1: Lock Provider Parity Contract In Tests

**Files:**

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_mem0_provider.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_provider_status.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_provider_capabilities.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_router.py`

- [ ] **Step 1: Write failing capability tests for provider families**

Example:

```python
def test_memory_os_provider_families_expose_capability_matrix():
    service = MemoryOSService()

    families = {family.family: family for family in service.list_provider_families()}

    assert "capabilities" in families["builtin"].model_dump()
    assert "capabilities" in families["openviking"].model_dump()
    assert "capabilities" in families["mem0"].model_dump()
```

- [ ] **Step 2: Write failing Mem0 runtime tests**

Example:

```python
def test_mem0_provider_supports_memory_runtime_contract(tmp_path):
    provider = Mem0MemoryProvider(base_dir=tmp_path, config={"mode": "managed"})

    payload = provider.get_memory()

    assert payload["version"] == "1.0"
    assert isinstance(provider.status(), dict)
    assert isinstance(provider.usage(), dict)
```

- [ ] **Step 3: Write failing provider status/router tests**

Example:

```python
def test_memory_os_router_exposes_provider_status_and_capabilities(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        families = client.get("/api/memory-os/providers/families")
        state = client.get("/api/memory-os/providers/state")

    assert families.status_code == 200
    assert state.status_code == 200
    assert "capabilities" in families.json()["families"][0]
```

- [ ] **Step 4: Run RED tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_os_mem0_provider.py \
  tests/test_memory_os_provider_status.py \
  tests/test_memory_os_provider_capabilities.py \
  tests/test_memory_os_service.py \
  tests/test_memory_os_router.py -q
```

Expected:

- tests fail because provider capability/status parity is incomplete and Mem0 is still a shell

- [ ] **Step 5: Commit**

```bash
git add \
  backend/tests/test_memory_os_mem0_provider.py \
  backend/tests/test_memory_os_provider_status.py \
  backend/tests/test_memory_os_provider_capabilities.py \
  backend/tests/test_memory_os_service.py \
  backend/tests/test_memory_os_router.py
git commit -m "test: lock provider parity contracts"
```

## Task 2: Introduce Explicit Provider Capability And Status Models

**Files:**

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/contracts.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/providers.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/service.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_provider_capabilities.py`

- [ ] **Step 1: Add explicit capability model**

Introduce shapes like:

```python
class ProviderCapabilityMatrix(BaseModel):
    memory_crud: str
    memory_search: str
    compact: str
    rebuild: str
    usage: str
    runtime_status: str

class ProviderFamilyMeta(BaseModel):
    family: str
    display_name: str
    supported_domains: list[str]
    supported_modes: list[str]
    capabilities: ProviderCapabilityMatrix
```

Allowed values should be explicit, e.g. `supported`, `partial`, `unsupported`.

- [ ] **Step 2: Add provider instance/runtime status models**

Extend provider state shapes with:

- runtime mode
- health
- capabilities
- status summary
- usage summary

Do not fake per-provider health if unknown; expose `unknown` explicitly.

- [ ] **Step 3: Run capability model tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_os_provider_capabilities.py \
  tests/test_memory_os_service.py -q
```

Expected:

- pass

- [ ] **Step 4: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/contracts.py \
  backend/packages/harness/nion/memory_os/providers.py \
  backend/packages/harness/nion/memory_os/service.py \
  backend/tests/test_memory_os_provider_capabilities.py \
  backend/tests/test_memory_os_service.py
git commit -m "feat: model provider capability and status surfaces"
```

## Task 3: Implement A Real Mem0 Runtime Provider

**Files:**

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/mem0_provider.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/packages/harness/nion/memory_os/registry.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/tests/test_memory_os_mem0_provider.py`

- [ ] **Step 1: Decide the first concrete Mem0 runtime contract**

For M6, Mem0 must at least:

- no longer throw immediately from `resolve_active_memory_provider`
- implement `get_memory()`
- implement `status()`
- implement `usage()`
- explicitly report unsupported `compact` / `rebuild` only if that is still true after source review

If a full remote Mem0 integration is not yet possible in this codebase, implement a clearly scoped compatibility provider that stores/loads memory with Mem0-shaped config and returns explicit capability/status rather than exploding.

- [ ] **Step 2: Implement provider class**

Minimum interface parity:

```python
class Mem0MemoryProvider:
    def get_memory(self) -> dict: ...
    def save_memory(self, payload: dict) -> bool: ...
    def clear_memory(self) -> dict: ...
    def delete_fact(self, fact_id: str) -> dict: ...
    def status(self) -> dict: ...
    def usage(self) -> dict: ...
```

Do not leave it as family metadata only.

- [ ] **Step 3: Wire Mem0 into active provider resolution**

`MemoryOSService.resolve_active_memory_provider()` must return a Mem0 provider instance instead of raising `NotImplementedError`.

- [ ] **Step 4: Run Mem0 tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_os_mem0_provider.py \
  tests/test_memory_os_service.py \
  tests/test_memory_os_registry.py -q
```

Expected:

- pass

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory_os/mem0_provider.py \
  backend/packages/harness/nion/memory_os/service.py \
  backend/packages/harness/nion/memory_os/registry.py \
  backend/tests/test_memory_os_mem0_provider.py \
  backend/tests/test_memory_os_service.py \
  backend/tests/test_memory_os_registry.py
git commit -m "feat: implement mem0 runtime provider"
```

## Task 4: Expand Provider Router And Frontend Types

**Files:**

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend/app/gateway/routers/memory_os.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/memory-os/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/memory-os/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/core/memory-os/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts`

- [ ] **Step 1: Expose richer provider families/state responses**

Backend family/state responses should include:

- capability matrix
- runtime mode
- provider summary/status when available

- [ ] **Step 2: Extend frontend types**

Add TS types for:

- provider capabilities
- provider runtime status
- provider health

- [ ] **Step 3: Make provider foundation card render parity-relevant metadata**

The card should render more than just family badges:

- current provider family
- current mode
- capability summary (supported / partial / unsupported)
- Mem0 no longer looking like a hollow badge

- [ ] **Step 4: Run frontend tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend && node --test \
  src/core/memory-os/api.test.ts \
  src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend && pnpm typecheck
```

Expected:

- pass

- [ ] **Step 5: Commit**

```bash
git add \
  backend/app/gateway/routers/memory_os.py \
  frontend/src/core/memory-os/types.ts \
  frontend/src/core/memory-os/api.ts \
  frontend/src/core/memory-os/hooks.ts \
  frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx \
  frontend/src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts
git commit -m "feat: expose provider parity metadata in api and ui"
```

## Task 5: Update Docs And Run Provider-Parity Verification

**Files:**

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/docs/test/05-settings-config-center/README.md`

- [ ] **Step 1: Update roadmap/parity docs**

Record M6 outcomes:

- Mem0 provider no longer metadata-only
- provider capability/status surface expanded
- remaining parity gaps explicitly documented

- [ ] **Step 2: Update test handoff doc**

Add QA coverage for:

- provider family capability rendering
- Mem0 runtime selection
- provider status / usage visibility

- [ ] **Step 3: Run backend verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_os_mem0_provider.py \
  tests/test_memory_os_provider_status.py \
  tests/test_memory_os_provider_capabilities.py \
  tests/test_memory_os_service.py \
  tests/test_memory_os_router.py \
  tests/test_memory_os_registry.py -q
```

- [ ] **Step 4: Run frontend verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend && node --test \
  src/core/memory-os/api.test.ts \
  src/components/workspace/settings/memory-provider-foundation-card.contract.test.ts
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/frontend && pnpm typecheck
```

- [ ] **Step 5: Desktop smoke**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity && make desktop-dev
```

Minimum smoke:

- open settings memory/provider surface
- verify provider families show richer capability/status metadata
- verify Mem0 no longer looks unsupported-by-crash

- [ ] **Step 6: Commit**

```bash
git add \
  docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-roadmap.md \
  docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md \
  docs/test/05-settings-config-center/README.md
git commit -m "docs: record provider parity milestone"
```

## Self-Review Checklist

- [ ] M6 stays focused on provider/runtime parity, not new product IA
- [ ] Mem0 is no longer a shell-only family
- [ ] Provider capability/status metadata is explicit rather than implied
- [ ] Unsupported operations stay explicit instead of pretending to work
- [ ] Verification covers backend, frontend, and desktop provider surface

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memoh-m6-provider-parity/docs/superpowers/plans/2026-03-31-memoh-style-memory-self-maintenance-m6-provider-parity-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints
