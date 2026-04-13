# Autonomous System Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Nion 建立第一批系统自治能力：统一 diagnostics/incident 语义、playbook registry、低风险自动修复策略，以及 observe-diagnose-act-verify 的执行闭环。

**Architecture:** 这份计划建立在 capability backbone 之上，不再解决“系统里有什么”，而是解决“知道系统里有什么之后，怎么诊断、怎么修、怎么验证、怎么持续执行”。第一批只做低风险、非代码型自治：bridge、provider/model 状态、vector index、document/projection sync、automation payload validation。

**Tech Stack:** Python 3.12, FastAPI, daemon control plane, incident store, diagnostics tools, pytest

---

## Scope Check

In scope:

- incident taxonomy
- playbook registry
- safe auto-fix policy
- first-batch remediation handlers
- verify-always loop

Out of scope:

- destructive auto-fix
- broad code rewriting
- autonomous schema migrations

---

## Read This First

- [2026-04-13-autonomous-system-operations-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-autonomous-system-operations-design.md)
- [control_plane_tools.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/control_plane_tools.py)
- [daemon incidents router + store](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/daemon/routers/incidents.py)
- [existing incident tests](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests)

---

## File Map

### Diagnostic backbone

- Create: `backend/packages/harness/nion/autonomy/models.py`
- Create: `backend/packages/harness/nion/autonomy/playbook_registry.py`
- Create: `backend/packages/harness/nion/autonomy/diagnostics.py`
- Create: `backend/packages/harness/nion/autonomy/remediation.py`

### Control plane integration

- Modify: `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`
- Modify: `backend/app/daemon/routers/incidents.py`

### Tests

- Create: `backend/tests/test_autonomy_playbook_registry.py`
- Create: `backend/tests/test_autonomy_remediation_policy.py`
- Create: `backend/tests/test_autonomy_handlers.py`

---

## Task 1: Freeze incident taxonomy and playbook registry in tests

**Files:**
- Create: `backend/tests/test_autonomy_playbook_registry.py`
- Create: `backend/tests/test_autonomy_remediation_policy.py`

- [ ] **Step 1: Add failing tests for first-batch playbooks**

```python
def test_playbook_registry_contains_first_batch_incident_types():
    from nion.autonomy.playbook_registry import build_playbook_registry

    registry = build_playbook_registry()
    ids = {item["id"] for item in registry}
    assert "bridge_disconnected" in ids
    assert "model_catalog_empty" in ids
    assert "vector_index_stale" in ids
    assert "document_projection_desynced" in ids
```

- [ ] **Step 2: Add failing tests for remediation levels**

```python
def test_remediation_policy_marks_document_projection_sync_as_auto_fix():
    from nion.autonomy.remediation import classify_remediation_level

    assert classify_remediation_level("document_projection_desynced") == "auto_fix"
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_autonomy_playbook_registry.py \
  backend/tests/test_autonomy_remediation_policy.py -q
```

Expected:

- FAIL because autonomy registry/policy does not exist

- [ ] **Step 4: Commit**

```bash
git add \
  backend/tests/test_autonomy_playbook_registry.py \
  backend/tests/test_autonomy_remediation_policy.py
git commit -m "test: freeze first-batch autonomy playbooks"
```

---

## Task 2: Implement autonomy models, playbooks, and remediation policy

**Files:**
- Create: `backend/packages/harness/nion/autonomy/models.py`
- Create: `backend/packages/harness/nion/autonomy/playbook_registry.py`
- Create: `backend/packages/harness/nion/autonomy/remediation.py`

- [ ] **Step 1: Add minimal models**

```python
class AutonomyPlaybook(BaseModel):
    id: str
    category: str
    safe_fix: bool
    verify_command: str
```

- [ ] **Step 2: Add first-batch playbooks**

```python
def build_playbook_registry() -> list[dict]:
    return [
        {"id": "bridge_disconnected", "category": "runtime", "safe_fix": True, ...},
        {"id": "document_projection_desynced", "category": "state_desync", "safe_fix": True, ...},
    ]
```

- [ ] **Step 3: Add remediation classifier**

```python
def classify_remediation_level(playbook_id: str) -> str:
    if playbook_id in {"bridge_disconnected", "document_projection_desynced", "vector_index_stale"}:
        return "auto_fix"
    return "confirm"
```

- [ ] **Step 4: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_autonomy_playbook_registry.py \
  backend/tests/test_autonomy_remediation_policy.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/autonomy/models.py \
  backend/packages/harness/nion/autonomy/playbook_registry.py \
  backend/packages/harness/nion/autonomy/remediation.py
git commit -m "feat: add autonomy playbook registry and remediation policy"
```

---

## Task 3: Expose autonomy diagnostics and handlers

**Files:**
- Create: `backend/packages/harness/nion/autonomy/diagnostics.py`
- Create: `backend/tests/test_autonomy_handlers.py`
- Modify: `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`

- [ ] **Step 1: Add failing tests for handlers**

```python
def test_document_projection_desync_handler_returns_safe_fix():
    from nion.autonomy.diagnostics import diagnose_autonomy_playbook

    result = diagnose_autonomy_playbook("document_projection_desynced")
    assert result["safe_fix"] is True
```

- [ ] **Step 2: Implement minimal diagnose handler**

```python
def diagnose_autonomy_playbook(playbook_id: str) -> dict:
    playbook = get_playbook(playbook_id)
    return {
        "playbook_id": playbook_id,
        "safe_fix": playbook["safe_fix"],
        "verify_command": playbook["verify_command"],
    }
```

- [ ] **Step 3: Expose through control plane tool**

```python
@tool("get_autonomy_playbooks", parse_docstring=True)
def get_autonomy_playbooks_tool() -> str:
    return json.dumps(build_playbook_registry(), ensure_ascii=False, indent=2)
```

- [ ] **Step 4: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_autonomy_handlers.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/autonomy/diagnostics.py \
  backend/packages/harness/nion/tools/builtins/control_plane_tools.py \
  backend/tests/test_autonomy_handlers.py
git commit -m "feat: expose autonomy diagnostics and playbook inspection"
```

---

## Task 4: Docs sync and verification

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Update docs to mention first-batch autonomous ops**

```md
- diagnose-first + safe auto-fix policy exists for first-batch non-code incidents
- autonomy playbooks now cover bridge/model/vector/document-projection issues
```

- [ ] **Step 2: Run focused verification**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_autonomy_playbook_registry.py \
  backend/tests/test_autonomy_remediation_policy.py \
  backend/tests/test_autonomy_handlers.py -q
```

Expected:

- PASS

- [ ] **Step 3: Commit**

```bash
git add README.md backend/CLAUDE.md docs/test/README.md
git commit -m "docs: sync autonomous system operations baseline"
```

---

## Self-Review

### Spec coverage

- playbook registry：Task 1, 2
- remediation policy：Task 1, 2
- autonomy diagnostics：Task 3
- docs sync：Task 4

### Placeholder scan

- 无 `TODO` / `TBD`
- 每个任务都给了最小代码、测试和命令

### Type consistency

- playbook ids 与 design 中一致
- remediation levels 统一为 `auto_fix` / `confirm`

---

Plan complete and saved to `docs/superpowers/plans/2026-04-13-autonomous-system-operations-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
