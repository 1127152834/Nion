# Memory OS M4 Growth And Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Memory OS 加上最小可用的 growth / governance surface，包括 learning topics、procedure drafts、soul proposals、user model corrections/freezes，以及最小的 agent-owned automation 管理接口。

**Architecture:** 本阶段优先做后端 contract 和最小产品面，不直接铺完整 UI。先让 Memory OS 能产生和管理 growth objects，并通过 gateway API 暴露可查询、可接受/拒绝、可冻结/暂停的控制面；前端只做最小读取与操作入口，避免在治理 contract 未稳定前堆大量展示层。

**Tech Stack:** FastAPI, Pydantic, SQLite, existing memory/automation routes, React contract tests, pytest

---

## File Structure

### New Files

- `backend/packages/harness/nion/memory_os/learning.py`
- `backend/packages/harness/nion/memory_os/procedures.py`
- `backend/packages/harness/nion/memory_os/soul.py`
- `backend/packages/harness/nion/memory_os/governance.py`
- `backend/app/gateway/routers/memory_growth.py`
- `backend/tests/test_memory_growth_router.py`
- `backend/tests/test_memory_os_governance.py`

### Modified Files

- `backend/packages/harness/nion/memory_os/repository.py`
- `backend/packages/harness/nion/memory_os/models.py`
- `backend/packages/harness/nion/memory_os/__init__.py`
- `backend/app/gateway/app.py`
- `backend/app/runtime/app_factory.py`
- `frontend/src/core/memory/*` as needed
- `frontend/src/components/workspace/memory/*` minimal surface additions

## Task 1: Add Governance Models And Service

**Files:**
- Create: `backend/packages/harness/nion/memory_os/governance.py`
- Test: `backend/tests/test_memory_os_governance.py`

- [ ] **Step 1: Write the failing governance test**

```python
from nion.memory_os.governance import (
    GOVERNANCE_ACTION_ACCEPT,
    GOVERNANCE_ACTION_FREEZE,
    GOVERNANCE_ACTION_REJECT,
    GOVERNANCE_ACTION_RESUME,
)


def test_governance_action_constants_are_stable():
    assert GOVERNANCE_ACTION_ACCEPT == "accept"
    assert GOVERNANCE_ACTION_REJECT == "reject"
    assert GOVERNANCE_ACTION_FREEZE == "freeze"
    assert GOVERNANCE_ACTION_RESUME == "resume"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_governance.py -q
```

Expected: import failure

- [ ] **Step 3: Implement governance action constants and minimal helper**

Implement:

```python
GOVERNANCE_ACTION_ACCEPT = "accept"
GOVERNANCE_ACTION_REJECT = "reject"
GOVERNANCE_ACTION_FREEZE = "freeze"
GOVERNANCE_ACTION_RESUME = "resume"
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_governance.py -q
```

Expected: PASS

## Task 2: Add Learning / Procedure / Soul Record Creation Helpers

**Files:**
- Create: `backend/packages/harness/nion/memory_os/learning.py`
- Create: `backend/packages/harness/nion/memory_os/procedures.py`
- Create: `backend/packages/harness/nion/memory_os/soul.py`
- Test: `backend/tests/test_memory_os_governance.py`

- [ ] **Step 1: Extend failing test to require simple creation helpers**

```python
from pathlib import Path

from nion.memory_os.learning import create_learning_topic
from nion.memory_os.procedures import create_procedure_draft
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul import create_soul_proposal


def test_growth_helpers_create_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    learning = create_learning_topic(repo, title="财务表达", summary="重复出现")
    procedure = create_procedure_draft(repo, title="财务周报结构", summary="三段式")
    soul = create_soul_proposal(repo, title="更结论先行", summary="长期交互显示用户偏好")

    assert learning["domain"] == "learning"
    assert procedure["domain"] == "procedure"
    assert soul["domain"] == "soul"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_governance.py -q
```

Expected: helper imports missing

- [ ] **Step 3: Implement minimal helper functions backed by `save_memory_record()`**

Helpers should create:

- `learning` active record
- `procedure` candidate record
- `soul` candidate record

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_os_governance.py -q
```

Expected: PASS

## Task 3: Add Memory Growth Router

**Files:**
- Create: `backend/app/gateway/routers/memory_growth.py`
- Modify: `backend/app/gateway/app.py`
- Test: `backend/tests/test_memory_growth_router.py`

- [ ] **Step 1: Write the failing router test**

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_memory_growth_router_lists_learning_and_soul_items(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        response = client.get("/api/memory/growth")

    assert response.status_code == 200
    body = response.json()
    assert "learning" in body
    assert "procedures" in body
    assert "soul_proposals" in body
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_growth_router.py -q
```

Expected: 404 or import failure

- [ ] **Step 3: Implement minimal router**

Add `GET /api/memory/growth` returning:

```json
{
  "learning": [],
  "procedures": [],
  "soul_proposals": []
}
```

driven from repository queries.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_growth_router.py -q
```

Expected: PASS

## Task 4: Add Minimal User Control Actions

**Files:**
- Modify: `backend/app/gateway/routers/memory_growth.py`
- Modify: `backend/packages/harness/nion/memory_os/repository.py`
- Test: `backend/tests/test_memory_growth_router.py`

- [ ] **Step 1: Extend the failing router test to require freeze/reject actions**

```python
def test_memory_growth_router_supports_freeze_and_reject(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        create = client.post(
            "/api/memory/growth/learning",
            json={"title": "财务表达", "summary": "重复出现"},
        )
        learning_id = create.json()["item"]["memory_id"]

        freeze = client.post(f"/api/memory/growth/{learning_id}/freeze")
        reject = client.post(f"/api/memory/growth/{learning_id}/reject")

    assert freeze.status_code == 200
    assert reject.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_growth_router.py -q
```

Expected: missing endpoints

- [ ] **Step 3: Implement minimal create/freeze/reject actions**

Add:

- `POST /api/memory/growth/learning`
- `POST /api/memory/growth/{memory_id}/freeze`
- `POST /api/memory/growth/{memory_id}/reject`

Repository needs minimal status update helper for `memory_records`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_memory_growth_router.py -q
```

Expected: PASS

## Task 5: Verification Sweep

**Files:**
- Test: new M4 tests

- [ ] **Step 1: Run focused M4 tests**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_memory_os_governance.py \
  tests/test_memory_growth_router.py -q
```

Expected: PASS

- [ ] **Step 2: Run regression suite for M0-M3 plus growth router**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_memory_os_contracts.py \
  tests/test_memory_os_paths.py \
  tests/test_memory_os_repository.py \
  tests/test_memory_os_access_log.py \
  tests/test_memory_os_import_legacy.py \
  tests/test_memory_os_projections.py \
  tests/test_memory_os_context_pack.py \
  tests/test_memory_os_prompt_integration.py \
  tests/test_memory_os_continuity_bridge.py \
  tests/test_memory_os_candidates.py \
  tests/test_memory_os_extractor.py \
  tests/test_memory_os_diary.py \
  tests/test_memory_os_consolidation.py \
  tests/test_memory_os_heartbeat.py \
  tests/test_memory_growth_router.py -q
```

Expected: PASS

## Self-Review

### Spec coverage

- Covers minimal M4 backend growth/governance contract.
- Intentionally defers richer frontend UI and proposal cards.

### Placeholder scan

- No TBD/TODO placeholders.

### Type consistency

- Uses stable `memory_id` and domain/status semantics.

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/superpowers/plans/2026-04-04-memory-os-m4-growth-governance-plan.md`.
