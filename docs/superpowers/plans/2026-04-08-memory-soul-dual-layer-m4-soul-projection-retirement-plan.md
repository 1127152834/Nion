# Memory Soul Dual-Layer M4 Soul, Projection, And Legacy Retirement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the final complete form of the architecture by introducing four-layer soul governance, `learning -> procedure / automation / soul reflection` projections, Soul Console product surfaces, and safe retirement of legacy extractor/queue/summary mainline responsibilities without breaking external compatibility routes.

**Architecture:** M4 is the convergence milestone. Canonical memory and read-path infrastructure already exist from M1-M3; M4 promotes soul governance to a first-class engine, turns projections into provenance-linked derived objects, and removes the remaining legacy internals from the primary path. Compatibility facades stay until retirement is safe, but truth ownership becomes unambiguous.

**Tech Stack:** Python 3.12, FastAPI, SQLite, local filesystem artifacts, LangChain/LangGraph, React 19, TypeScript, TanStack Query, `uv run pytest`, `pnpm --dir frontend test:contracts`

---

## File Structure

### New Backend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/soul/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/soul/judge.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/soul/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/projections/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_soul_judge_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_projection_service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_legacy_memory_retirement.py`

### Modified Backend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/soul_runtime.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/soul_artifacts.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/soul_governance.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/relationship_soul.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/growth_orchestrator.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/projections.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/automation_bridge.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/queue.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/updater.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_growth.py`

### New Frontend Files

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-console-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-console-page.contract.test.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul-console/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul-console/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul-console/hooks.ts`

### Modified Frontend Files

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-summary-card.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-proposal-list.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-growth-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx`

## Task 1: Introduce Four-Layer Soul Models And Soul Judge

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/soul/models.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/soul/judge.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_soul_judge_service.py`

- [x] **Step 1: Write failing tests for four-layer soul decision rules**

```python
from nion.memory.soul.judge import judge_soul_signal
from nion.memory.soul.models import SoulSignal


def test_soul_judge_accepts_overlay_not_constitution_for_short_term_adjustment():
    signal = SoulSignal(
        signal_id="sig_1",
        source_memory_ids=["mem_1"],
        suggested_layer="adaptive_overlay",
        summary="最近减少鼓励式措辞",
        confidence=0.8,
        evidence_ids=["ev_1"],
    )

    decision = judge_soul_signal(signal, existing_layers={})

    assert decision.action == "accept_overlay"


def test_soul_judge_rejects_direct_constitution_mutation():
    signal = SoulSignal(
        signal_id="sig_2",
        source_memory_ids=["mem_2"],
        suggested_layer="constitution",
        summary="因为一次聊天改变核心人格",
        confidence=0.9,
        evidence_ids=["ev_2"],
    )

    decision = judge_soul_signal(signal, existing_layers={})

    assert decision.action == "reject"
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_soul_judge_service.py -q
```

Expected: import failure

- [x] **Step 3: Implement soul models and judge**

Implement:

- soul layer enum:
  - `constitution`
  - `identity_narrative`
  - `relationship_stance`
  - `adaptive_overlay`
- `SoulSignal`
- `SoulJudgeDecision`
- decision actions:
  - `accept_overlay`
  - `extend_overlay`
  - `promote_to_relationship_stance`
  - `promote_to_identity_narrative`
  - `reject`
  - `expire_existing_overlay`

- [x] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_soul_judge_service.py -q
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/soul/models.py \
  backend/packages/harness/nion/memory/soul/judge.py \
  backend/tests/test_soul_judge_service.py
git commit -m "feat: add four-layer soul judge models"
```

### Task 2: Rebuild Soul Runtime And Soul Governance On Canonical Layers

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/soul/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/soul_runtime.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/soul_artifacts.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/soul_governance.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/relationship_soul.py`

- [x] **Step 1: Extend existing soul runtime tests**

Add to `backend/tests/test_memory_os_soul_runtime.py`:

```python
def test_soul_runtime_assembles_constitution_identity_relationship_and_overlay(tmp_path):
    ...
    runtime = compile_soul_runtime(repo)
    assert "<constitution>" in runtime
    assert "<relationship_stance>" in runtime
    assert "<identity_narrative>" in runtime
    assert "<adaptive_overlay>" in runtime
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_os_soul_runtime.py -q
```

Expected: failures because runtime still uses old tags/semantics

- [x] **Step 3: Implement canonical soul service and update runtime/governance**

Implement:

- canonical soul layer reads
- layer-specific freshness rules
- relationship stance derived from canonical relationship memory
- overlay promotion/expiry rules
- soul governance writes canonical revisions and compatible events

- [x] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_os_soul_runtime.py \
  tests/test_memory_os_soul_governance.py \
  tests/test_memory_os_soul_events.py -q
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/soul/service.py \
  backend/packages/harness/nion/memory_os/soul_runtime.py \
  backend/packages/harness/nion/memory_os/soul_artifacts.py \
  backend/packages/harness/nion/memory_os/soul_governance.py \
  backend/packages/harness/nion/memory_os/relationship_soul.py \
  backend/tests/test_memory_os_soul_runtime.py
git commit -m "feat: rebuild soul runtime on canonical layers"
```

### Task 3: Implement Learning -> Procedure / Automation / Soul Reflection Projection Chain

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/projections/service.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_memory_projection_service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/growth_orchestrator.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/projections.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/automation_bridge.py`

- [x] **Step 1: Write failing projection tests**

```python
from pathlib import Path

from nion.memory.projections.service import project_learning_outputs
from nion.memory_os.repository import MemoryOSRepository


def test_project_learning_outputs_creates_procedure_and_automation_links(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    learning_id = repo.create_memory_node_for_test(
        domain="learning",
        kind="active_arc",
        claim="月底高压期低刺激支持",
        status="active",
        traceability_state="full",
    )

    result = project_learning_outputs(repo, learning_id)

    assert result["procedure_id"]
    assert result["automation_projection_id"]
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_memory_projection_service.py -q
```

Expected: import failure

- [x] **Step 3: Implement projection service and update orchestrator**

Implement:

- `learning -> procedure`
- `learning -> automation_projection`
- `learning -> soul_reflection input`
- provenance links back to canonical memory ids and revisions

Keep existing growth/soul event stream compatibility.

- [x] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_memory_projection_service.py \
  tests/test_memory_os_growth_orchestrator.py \
  tests/test_memory_os_automation_bridge.py -q
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/memory/projections/service.py \
  backend/packages/harness/nion/memory_os/growth_orchestrator.py \
  backend/packages/harness/nion/memory_os/projections.py \
  backend/packages/harness/nion/memory_os/automation_bridge.py \
  backend/tests/test_memory_projection_service.py
git commit -m "feat: add canonical learning projection chain"
```

### Task 4: Ship Soul Console UI And Replace Summary-Only Soul Surfaces

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul-console/api.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul-console/types.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul-console/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-console-page.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-console-page.contract.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/soul/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-summary-card.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/soul-proposal-list.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-growth-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx`

- [x] **Step 1: Add failing contract test for Soul Console**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

void test("soul console page shows constitution identity relationship and overlay layers", async () => {
  const source = await readFile(new URL("./soul-console-page.tsx", import.meta.url), "utf8");
  assert.match(source, /Constitution/);
  assert.match(source, /Identity Narrative/);
  assert.match(source, /Relationship Stance/);
  assert.match(source, /Adaptive Overlay/);
});
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/soul-console-page.contract.test.ts
```

Expected: missing page

- [x] **Step 3: Implement Soul Console and update soul data hooks**

Implement:

- Soul Console page
- layer cards with current revision, reason, timestamp
- actions:
  - edit relationship stance
  - edit overlay
  - rollback recent overlay
- update soul hooks/API to support new console payloads

- [x] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/components/workspace/memory/soul-console-page.contract.test.ts \
  src/components/workspace/memory/soul-summary-card.contract.test.ts \
  src/components/workspace/memory/soul-proposal-list.contract.test.ts
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add \
  frontend/src/core/soul-console/api.ts \
  frontend/src/core/soul-console/types.ts \
  frontend/src/core/soul-console/hooks.ts \
  frontend/src/components/workspace/memory/soul-console-page.tsx \
  frontend/src/components/workspace/memory/soul-console-page.contract.test.ts \
  frontend/src/core/soul/api.ts \
  frontend/src/core/soul/hooks.ts \
  frontend/src/components/workspace/memory/soul-summary-card.tsx \
  frontend/src/components/workspace/memory/soul-proposal-list.tsx \
  frontend/src/components/workspace/memory/memory-growth-page.tsx \
  frontend/src/components/workspace/memory/memory-home-page.tsx
git commit -m "feat: ship soul console and layered soul surfaces"
```

### Task 5: Retire Legacy Memory Mainline Responsibilities Safely

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_legacy_memory_retirement.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/queue.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/updater.py`

- [x] **Step 1: Write failing retirement tests**

```python
from unittest.mock import patch

from nion.agents.lead_agent.agent import _build_middlewares


def test_legacy_memory_middleware_and_queue_are_not_primary_after_m4():
    with patch("nion.agents.lead_agent.agent.get_app_config"), patch(
        "nion.agents.lead_agent.agent.get_model_registry_service"
    ) as mock_registry:
        mock_registry.return_value.get_default_model.side_effect = ValueError("no model")
        middlewares = _build_middlewares({"configurable": {}}, model_name="test-model")

    names = [type(item).__name__ for item in middlewares]
    assert "MemoryMiddleware" not in names
```

- [x] **Step 2: Run tests to verify current state**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_legacy_memory_retirement.py \
  tests/test_memory_os_final_cutover.py -q
```

Expected: current tests or new assertions show legacy components still present internally

- [x] **Step 3: Retire old queue/updater from primary responsibilities**

Implement:

- keep legacy modules only as compatibility or test shims where unavoidable
- remove any remaining primary-path responsibility from `agents/memory/queue.py` and `agents/memory/updater.py`
- document that canonical write/read truth now lives in v2 modules

- [x] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_legacy_memory_retirement.py \
  tests/test_memory_os_final_cutover.py \
  tests/test_client_surface_policy.py -q
```

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/agents/lead_agent/agent.py \
  backend/packages/harness/nion/agents/memory/queue.py \
  backend/packages/harness/nion/agents/memory/updater.py \
  backend/tests/test_legacy_memory_retirement.py
git commit -m "refactor: retire legacy memory mainline responsibilities"
```

### Task 6: Full Program Verification And Final Checkpoint

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md`

- [x] **Step 1: Run backend final verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_soul_judge_service.py \
  tests/test_memory_projection_service.py \
  tests/test_legacy_memory_retirement.py \
  tests/test_memory_os_soul_runtime.py \
  tests/test_memory_os_soul_governance.py \
  tests/test_memory_os_growth_orchestrator.py \
  tests/test_memory_os_automation_bridge.py \
  tests/test_memory_os_final_cutover.py -q
```

Expected: PASS

- [x] **Step 2: Run frontend final verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm test:contracts -- \
  src/components/workspace/memory/soul-console-page.contract.test.ts \
  src/components/workspace/memory/soul-summary-card.contract.test.ts \
  src/components/workspace/memory/soul-proposal-list.contract.test.ts \
  src/components/workspace/memory/memory-home-page.contract.test.ts
```

Expected: PASS

- [x] **Step 3: Update roadmap/spec to mark full architecture delivery**

Record that M4 completion means:

- soul governance is layered and canonical
- learning projections are canonical and provenance-linked
- legacy memory internals are retired from primary use
- compatibility facades remain stable

- [x] **Step 4: Commit**

Completion note 2026-04-09:

- Soul Console 最终以独立路由 `/workspace/memory/soul` 与独立 API `/api/memory/soul` 交付，而不是继续保留 `growth?soul=console` 借道路径
- legacy queue / updater 被保留为 compatibility-only shim，但已显式退出 primary path 语义
- 该计划中的所有步骤已经完成，并由 milestone-level verification 重新验证

```bash
git add \
  docs/superpowers/plans/2026-04-08-memory-soul-dual-layer-roadmap.md \
  docs/superpowers/specs/2026-04-08-nion-memory-soul-dual-layer-design.md
git commit -m "docs: record m4 dual-layer memory completion checkpoint"
```
