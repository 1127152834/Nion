# Memory Soul Dual-Layer M3 Runtime Recall And Vector Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace summary-dump prompt injection with a `memory_read`-gated Runtime Memory Engine that assembles layered context from canonical memory, taxonomy/FTS retrieval, and a local embedded vector sidecar with ordinary-user-friendly configuration.

**Architecture:** M3 is the full read-path cutover milestone. It introduces runtime retrieval planning, search fusion, local/remote/custom embedding providers, vector index rebuild semantics, and section-based prompt assembly. Existing continuity behavior remains as a fallback until the new Runtime Memory Engine passes compatibility checks and becomes primary.

**Tech Stack:** Python 3.12, FastAPI, SQLite FTS5, local filesystem, local embedded vector store, LangChain/LangGraph, React 19, TypeScript, TanStack Query, `uv run pytest`, `pnpm --dir frontend test:contracts`

---

## File Structure

### New Backend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/search_plan.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/search_fusion/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/search_fusion/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/provider.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/vector_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/local_managed.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/remote_managed.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/custom_compatible.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_settings.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_runtime_memory_engine.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_search_fusion.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_embedding_providers.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_settings_router.py`

### Modified Backend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/context_assembler.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/app_config.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/app.py`

### New Frontend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-settings/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-settings/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-settings/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-runtime-trace-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-embedding-panel.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-runtime-trace-page.contract.test.ts`

### Modified Frontend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx`

## Task 1: Lock Layered Read Path Contracts And `memory_read` Gate

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_runtime_memory_engine.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/models.py`

- [ ] **Step 1: Write failing tests for read gating and layered sections**

```python
from nion.memory.runtime_engine.models import RuntimeMemorySections
from nion.memory.runtime_engine.service import build_runtime_memory_context
from nion.memory.session_policy import MemorySessionPolicy


def test_runtime_memory_context_returns_empty_sections_when_memory_read_is_false():
    policy = MemorySessionPolicy(
        session_mode="temporary_chat",
        memory_read=False,
        memory_write=False,
        allow_memory_read=False,
        allow_memory_write=False,
        allow_durable_evidence=False,
    )

    result = build_runtime_memory_context(
        query="帮我继续之前的话题",
        thread_id="thread-1",
        policy=policy,
    )

    assert result.sections == RuntimeMemorySections.empty()


def test_runtime_memory_sections_include_expected_layers():
    sections = RuntimeMemorySections(
        constitution="core",
        relationship_stance="stance",
        identity_narrative="narrative",
        hot_memories=["m1"],
        relevant_procedures=["p1"],
        scoped_recall=["r1"],
        verbatim_evidence=["e1"],
    )

    assert sections.constitution == "core"
    assert sections.verbatim_evidence == ["e1"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_memory_engine.py -q
```

Expected: import failure

- [ ] **Step 3: Implement runtime models and empty-section helper**

Implement:

- `RuntimeMemorySections`
- `RuntimeMemoryResult`
- `.empty()` factory for gated/no-read sessions

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_memory_engine.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/runtime_engine/models.py \
  backend/tests/test_runtime_memory_engine.py
git commit -m "feat: add runtime memory section contracts"
```

### Task 2: Implement Taxonomy + FTS + Link Search Fusion

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/search_fusion/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/search_fusion/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_search_fusion.py`

- [ ] **Step 1: Write failing tests for fused retrieval ordering**

```python
from nion.memory.search_fusion.service import fuse_memory_search_candidates


def test_fuse_memory_search_candidates_prioritizes_strong_multi_route_hits():
    ranked = fuse_memory_search_candidates(
        taxonomy_hits=[{"id": "a", "score": 0.9}],
        fts_hits=[{"id": "a", "score": 0.8}, {"id": "b", "score": 0.9}],
        vector_hits=[{"id": "a", "score": 0.85}, {"id": "c", "score": 0.95}],
        link_hits=[{"id": "b", "score": 0.7}],
    )

    assert ranked[0]["id"] == "a"
    assert {item["id"] for item in ranked[:3]} == {"a", "b", "c"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_search_fusion.py -q
```

Expected: import failure

- [ ] **Step 3: Implement search fusion service**

Implement:

- normalized candidate id merge
- weighted ranking across:
  - taxonomy route
  - FTS route
  - vector route
  - link route
- deterministic stable ordering

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_search_fusion.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/search_fusion/models.py \
  backend/packages/harness/nion/memory/search_fusion/service.py \
  backend/tests/test_memory_search_fusion.py
git commit -m "feat: add memory search fusion service"
```

### Task 3: Add Embedded Vector Provider Abstractions And Model Fingerprints

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/provider.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/vector_store.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/local_managed.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/remote_managed.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/custom_compatible.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_embedding_providers.py`

- [ ] **Step 1: Write failing tests for provider fingerprints**

```python
from nion.memory.embedding.models import EmbeddingModelFingerprint


def test_embedding_model_fingerprint_changes_when_provider_or_model_changes():
    a = EmbeddingModelFingerprint(
        provider="local_managed",
        model_id="bge-small",
        dimensions=384,
        normalization="l2",
        chunking_policy="paragraph_v1",
        embedding_version="1",
    )
    b = EmbeddingModelFingerprint(
        provider="remote_managed",
        model_id="bge-small",
        dimensions=384,
        normalization="l2",
        chunking_policy="paragraph_v1",
        embedding_version="1",
    )

    assert a.as_cache_key() != b.as_cache_key()
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_embedding_providers.py -q
```

Expected: import failure

- [ ] **Step 3: Implement provider abstractions**

Implement:

- `EmbeddingModelFingerprint`
- common provider protocol
- local managed provider metadata
- remote managed provider metadata
- custom compatible provider metadata
- vector store abstraction with rebuild-aware API

Do not make vector storage a truth source.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_embedding_providers.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/embedding/models.py \
  backend/packages/harness/nion/memory/embedding/provider.py \
  backend/packages/harness/nion/memory/embedding/vector_store.py \
  backend/packages/harness/nion/memory/embedding/local_managed.py \
  backend/packages/harness/nion/memory/embedding/remote_managed.py \
  backend/packages/harness/nion/memory/embedding/custom_compatible.py \
  backend/tests/test_memory_embedding_providers.py
git commit -m "feat: add embedded memory embedding provider abstractions"
```

### Task 4: Build Runtime Memory Engine And Integrate Prompt Sections

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/search_plan.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/context_assembler.py`

- [ ] **Step 1: Extend runtime tests to cover primary read path**

Add to `backend/tests/test_runtime_memory_engine.py`:

```python
def test_runtime_memory_engine_builds_layered_sections_when_memory_read_enabled(monkeypatch):
    policy = MemorySessionPolicy(
        session_mode="workspace",
        memory_read=True,
        memory_write=False,
        allow_memory_read=True,
        allow_memory_write=False,
        allow_durable_evidence=False,
    )

    result = build_runtime_memory_context(
        query="继续按我喜欢的方式给出结论",
        thread_id="thread-1",
        policy=policy,
    )

    assert result.sections is not None
    assert hasattr(result.sections, "hot_memories")
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_runtime_memory_engine.py -q
```

Expected: failures for missing service implementation

- [ ] **Step 3: Implement Runtime Memory Engine**

Implement:

- intent classification
- depth plan selection
- search fusion invocation
- section assembly:
  - constitution
  - relationship_stance
  - identity_narrative
  - hot_memories
  - relevant_procedures
  - scoped_recall
  - verbatim_evidence

Integrate:

- `ContinuityMiddleware.before_model`
- lead prompt assembly helpers

The middleware must skip long-term injection when `memory_read` is false.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_runtime_memory_engine.py \
  tests/test_memory_os_prompt_integration.py \
  tests/test_memory_os_soul_prompt_integration.py \
  tests/test_memory_os_continuity_bridge.py -q
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/runtime_engine/search_plan.py \
  backend/packages/harness/nion/memory/runtime_engine/service.py \
  backend/packages/harness/nion/agents/middlewares/continuity_middleware.py \
  backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/packages/harness/nion/memory_os/context_assembler.py \
  backend/tests/test_runtime_memory_engine.py
git commit -m "feat: add runtime memory engine primary read path"
```

### Task 5: Ship Memory Settings Surface For Local Managed Embedding And Runtime Trace

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_settings.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_settings_router.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-settings/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-settings/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/memory-settings/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-embedding-panel.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-runtime-trace-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-runtime-trace-page.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx`

- [ ] **Step 1: Write failing router and frontend contract tests**

```python
from fastapi.testclient import TestClient
from app.gateway.app import app


def test_memory_settings_router_exists():
    client = TestClient(app)
    response = client.get("/api/memory/settings")
    assert response.status_code == 200
```

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

void test("memory settings page exposes local recommended and cloud enhanced modes", async () => {
  const source = await readFile(new URL("./memory-embedding-panel.tsx", import.meta.url), "utf8");
  assert.match(source, /本机推荐/);
  assert.match(source, /云端增强/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_settings_router.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/settings/memory-embedding-panel.contract.test.ts \
  src/components/workspace/memory/memory-runtime-trace-page.contract.test.ts
```

Expected: missing routes/components

- [ ] **Step 3: Implement settings router and frontend surfaces**

Implement:

- `/api/memory/settings`
  - current provider mode
  - download status
  - active fingerprint
  - index health
- Memory settings embedding panel
  - `本机推荐`
  - `云端增强`
  - `高级自定义`
- Runtime Trace page wired to M1 trace router

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_settings_router.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/settings/memory-embedding-panel.contract.test.ts \
  src/components/workspace/memory/memory-runtime-trace-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/app/gateway/routers/memory_settings.py \
  backend/tests/test_memory_settings_router.py \
  frontend/src/core/memory-settings/api.ts \
  frontend/src/core/memory-settings/types.ts \
  frontend/src/core/memory-settings/hooks.ts \
  frontend/src/components/workspace/settings/memory-embedding-panel.tsx \
  frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts \
  frontend/src/components/workspace/memory/memory-runtime-trace-page.tsx \
  frontend/src/components/workspace/memory/memory-runtime-trace-page.contract.test.ts \
  frontend/src/components/workspace/settings/memory-settings-page.tsx \
  frontend/src/components/workspace/memory/memory-home-page.tsx
git commit -m "feat: ship memory embedding settings and runtime trace surfaces"
```

### Task 6: Verify M3 Cutover And Record Checkpoint

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md`

- [ ] **Step 1: Run backend verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_runtime_memory_engine.py \
  tests/test_memory_search_fusion.py \
  tests/test_memory_embedding_providers.py \
  tests/test_memory_settings_router.py \
  tests/test_memory_os_prompt_integration.py \
  tests/test_memory_os_soul_prompt_integration.py \
  tests/test_memory_os_continuity_bridge.py -q
```

Expected: PASS

- [ ] **Step 2: Run frontend contract verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test:contracts -- \
  src/components/workspace/settings/memory-embedding-panel.contract.test.ts \
  src/components/workspace/memory/memory-runtime-trace-page.contract.test.ts \
  src/components/workspace/memory/memory-home-page.contract.test.ts
```

Expected: PASS

- [ ] **Step 3: Update roadmap/spec checkpoint notes**

Record that M3 completion means:

- Runtime Memory Engine is primary read path
- `memory_read` gates are enforced
- vector layer is embedded and rebuildable
- local managed embedding UX exists
- legacy continuity is now fallback, not primary

- [ ] **Step 4: Commit**

```bash
git add \
  docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md \
  docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md
git commit -m "docs: record m3 dual-layer memory checkpoint"
```
