# Approval Request Object Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把“通用工具权限审批”和“本机动作计划审批”从当前共享的 `permission_request` 兼容壳中正式分型，收口为清晰的 approval domain，同时保持现有 bridge / workspace / local-actions 主线可回归。

**Architecture:** 这次改造不新增另一套审批系统，而是在现有 thread permission 主链上把审批对象提升为显式 `kind` 分型。后端先升级存储模型与路由响应，再升级 guardrail / local-actions 事件发射，最后让 frontend 与 bridge runtime 按 `approval_kind` 分流，并保留一段兼容窗口读取旧 payload。整个改造遵循“先合同、后适配、再删除 fallback”的顺序，避免现有本机动作审批闭环回退成补丁叠补丁。

**Tech Stack:** Python 3.12, FastAPI, dataclass + JSON persistence, TypeScript, React, Electron main/preload, pytest, Node.js contract tests

---

## Scope Check

这次计划只做**审批对象建模与主线收口**，不扩新的业务能力边界。

包含：

- approval request 存储模型分型
- resolve 路由分型响应
- guardrail 通用工具审批事件升级
- local-actions 审批事件升级
- frontend / bridge 按 `approval_kind` 分流
- 旧 `permission_request.tool_name === "local_actions_review"` 兼容迁移

不包含：

- 新的本机动作白名单能力
- 新的 bridge 平台适配器能力
- richer 富卡片 UI 设计迭代
- 任意控机或任意 shell 权限扩张

---

## Read This First

- [2026-04-15-controlled-local-actions-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-controlled-local-actions-design.md)
- [thread_permissions.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/thread_permissions.py)
- [middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/guardrails/middleware.py)
- [threads.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/threads.py)
- [permission-request.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/permission-request.ts)
- [types.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/types.ts)
- [message-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-list.tsx)
- [bridge-manager.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/bridge/bridge-manager.ts)
- [nion-thread-client.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/bridge/nion-thread-client.ts)

---

## File Map

### Backend approval domain

- Modify: `backend/packages/harness/nion/thread_permissions.py`
- Create: `backend/packages/harness/nion/approval_requests.py`
- Create: `backend/tests/test_approval_request_store.py`

Responsibility:

- define the canonical approval request record with explicit `approval_kind`
- preserve thread-local persistence and replay semantics
- support compatibility reads for existing `thread_permissions.json` entries

### Backend emitters / routers

- Modify: `backend/packages/harness/nion/guardrails/middleware.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/app/gateway/routers/local_actions.py`
- Modify: `backend/tests/test_thread_permission_router.py`
- Create: `backend/tests/test_local_actions_approval_contract.py`

Responsibility:

- emit `tool_permission` approval requests from guardrails
- emit `local_action_plan` approval requests from local-actions routes
- resolve approval requests with explicit typed response payloads

### Frontend approval parsing / rendering

- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/permission-request.ts`
- Modify: `frontend/src/core/threads/permission-request.test.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/permission-request-card.tsx`
- Modify: `frontend/src/components/workspace/messages/local-actions-review-card.tsx`
- Modify: `frontend/src/components/workspace/messages/permission-request.contract.test.ts`
- Modify: `frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts`

Responsibility:

- normalize approval requests into an explicit discriminated union
- keep generic tool approval cards and local-action review cards separate
- preserve compatibility with old backend payloads during migration

### Desktop bridge runtime

- Modify: `desktop/src/main/bridge/nion-thread-client.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Modify: `desktop/tests/nion-thread-client-behavior.test.mjs`
- Modify: `desktop/tests/bridge-manager-behavior.test.mjs`

Responsibility:

- consume typed approval responses instead of inferring from `tool_name`
- keep remote approval deterministic for local-action execution
- preserve generic tool permission flow for non-local-actions lanes

### Docs sync

- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

Responsibility:

- document approval request typing and migration direction
- replace any statement that still implies local-actions are just a special `permission_request`

---

## Task 1: Freeze the approval request domain model

**Files:**
- Create: `backend/packages/harness/nion/approval_requests.py`
- Modify: `backend/packages/harness/nion/thread_permissions.py`
- Create: `backend/tests/test_approval_request_store.py`

- [ ] **Step 1: Write the failing approval store tests**

```python
from nion.approval_requests import ApprovalRequestKind
from nion.thread_permissions import (
    create_thread_approval_request,
    get_thread_approval_request,
    resolve_thread_approval_request,
)


def test_thread_approval_store_roundtrips_tool_permission_kind(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_approval_request(
        thread_id="thread-tool",
        approval_kind="tool_permission",
        tool_name="bash",
        tool_input={"command": "echo hi"},
        original_message_text="run bash",
    )

    loaded = get_thread_approval_request(
        thread_id="thread-tool",
        approval_request_id=request.id,
    )

    assert loaded is not None
    assert loaded.approval_kind == "tool_permission"
    assert loaded.tool_name == "bash"


def test_thread_approval_store_roundtrips_local_action_plan_kind(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_approval_request(
        thread_id="thread-local-actions",
        approval_kind="local_action_plan",
        local_action_payload={
            "execution_id": "exec-1",
            "plan_id": "plan-1",
            "summary": "Capture active window",
            "actions": [
                {"action_type": "capture_active_window", "target": "active_window"}
            ],
        },
        original_message_text="帮我截图",
    )

    loaded = get_thread_approval_request(
        thread_id="thread-local-actions",
        approval_request_id=request.id,
    )

    assert loaded is not None
    assert loaded.approval_kind == "local_action_plan"
    assert loaded.local_action_payload["execution_id"] == "exec-1"


def test_thread_approval_store_reads_legacy_permission_request_records(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_approval_request(
        thread_id="thread-legacy",
        approval_kind="tool_permission",
        tool_name="bash",
        tool_input={"command": "echo hi"},
        original_message_text="run bash",
    )
    resolve_thread_approval_request(
        thread_id="thread-legacy",
        approval_request_id=request.id,
        decision="allow",
    )

    loaded = get_thread_approval_request(
        thread_id="thread-legacy",
        approval_request_id=request.id,
    )

    assert loaded is not None
    assert loaded.status == "allow"
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_approval_request_store.py -q
```

Expected:

- FAIL because `approval_requests.py` and the new `thread_permissions` API do not exist yet

- [ ] **Step 3: Add the canonical approval record**

```python
from dataclasses import dataclass
from typing import Any, Literal

ApprovalRequestKind = Literal["tool_permission", "local_action_plan"]
ApprovalDecision = Literal["allow", "allow_session", "deny"]


@dataclass
class ThreadApprovalRequestRecord:
    id: str
    thread_id: str
    approval_kind: ApprovalRequestKind
    original_message_text: str
    replay_payload: dict[str, Any]
    status: str
    created_at: str
    tool_name: str | None = None
    tool_input: dict[str, Any] | None = None
    local_action_payload: dict[str, Any] | None = None
    resolved_at: str | None = None
    consumed: bool = False
```

- [ ] **Step 4: Upgrade thread permission store to typed wrappers**

```python
def create_thread_approval_request(...): ...
def resolve_thread_approval_request(...): ...
def get_thread_approval_request(...): ...

# compatibility wrappers
def create_thread_permission_request(...): ...
def resolve_thread_permission_request(...): ...
def get_thread_permission_request(...): ...
```

Requirements:

- old call sites keep working through wrappers
- newly created records always persist `approval_kind`
- legacy rows without `approval_kind` are interpreted as `tool_permission`

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_approval_request_store.py backend/tests/test_thread_permissions_store.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  backend/packages/harness/nion/approval_requests.py \
  backend/packages/harness/nion/thread_permissions.py \
  backend/tests/test_approval_request_store.py
git commit -m "refactor: introduce typed approval request records"
```

---

## Task 2: Emit typed approval requests from guardrails and local-actions

**Files:**
- Modify: `backend/packages/harness/nion/guardrails/middleware.py`
- Modify: `backend/app/gateway/routers/local_actions.py`
- Create: `backend/tests/test_local_actions_approval_contract.py`

- [ ] **Step 1: Write the failing local-actions approval contract test**

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_local_actions_plan_emits_local_action_plan_approval_request(monkeypatch, tmp_path):
    # same config bootstrap pattern as existing local-actions router tests
    with TestClient(create_app()) as client:
        response = client.post(
            "/api/local-actions/plan",
            json={
                "source_surface": "bridge",
                "source_channel": "telegram",
                "user_input": "Organize my Downloads folder",
            },
        )

    payload = response.json()
    assert payload["execution"]["approval_status"] == "pending"
    assert payload["approval_request"]["approval_kind"] == "local_action_plan"
    assert payload["approval_request"]["local_action_payload"]["execution_id"] == payload["execution"]["execution_id"]
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_local_actions_approval_contract.py -q
```

Expected:

- FAIL because the route does not include typed approval request metadata yet

- [ ] **Step 3: Upgrade guardrail middleware payload**

Requirements:

- generic tool approvals should emit:

```python
"permission_request": {
    "id": approval_request.id,
    "approval_kind": "tool_permission",
    "tool_name": tool_name,
    "tool_input": tool_input,
    ...
}
```

- keep existing `tool_name` / `tool_input` during migration

- [ ] **Step 4: Upgrade local-actions plan route payload**

Requirements:

- when `approval_status == "pending"`, include:

```python
"approval_request": {
    "id": f"approval_{execution.execution_id}",
    "approval_kind": "local_action_plan",
    "local_action_payload": {
        "goal_id": goal.goal_id,
        "plan_id": plan.plan_id,
        "execution_id": execution.execution_id,
        "summary": plan.summary,
        "risk_level": plan.risk_level,
        "irreversible_action_count": ...,
        "actions": [...],
    },
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_local_actions_approval_contract.py \
  backend/tests/test_guardrail_middleware.py \
  backend/tests/test_tool_runtime_permission_contract.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  backend/packages/harness/nion/guardrails/middleware.py \
  backend/app/gateway/routers/local_actions.py \
  backend/tests/test_local_actions_approval_contract.py
git commit -m "refactor: emit typed approval request payloads"
```

---

## Task 3: Return typed approval results from resolve routes

**Files:**
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/tests/test_thread_permission_router.py`

- [ ] **Step 1: Write the failing resolve response test**

```python
def test_bridge_permission_resolve_returns_approval_kind_for_local_actions(...):
    ...
    assert response.json()["approval_kind"] == "local_action_plan"
    assert response.json()["local_action_result"]["execution_id"] == "exec-1"


def test_workspace_permission_resolve_returns_approval_kind_for_tool_permission(...):
    ...
    assert response.json()["approval_kind"] == "tool_permission"
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_thread_permission_router.py -q
```

Expected:

- FAIL because the route only returns `tool_name` + ad-hoc `local_actions`

- [ ] **Step 3: Add typed resolve response projection**

Requirements:

- generic tool permission:

```python
{
    "ok": True,
    "decision": decision,
    "approval_kind": "tool_permission",
    "tool_permission_result": {
        "tool_name": latest.tool_name,
        "tool_input": latest.tool_input,
    },
    ...
}
```

- local action plan:

```python
{
    "ok": True,
    "decision": decision,
    "approval_kind": "local_action_plan",
    "local_action_result": {
        "execution_id": ...,
        "plan_id": ...,
        "actions": [...],
    },
    ...
}
```

- keep old `tool_name` / `local_actions` keys temporarily for compatibility

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_thread_permission_router.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/gateway/routers/threads.py backend/tests/test_thread_permission_router.py
git commit -m "refactor: type approval resolve responses"
```

---

## Task 4: Normalize frontend approval requests into a discriminated union

**Files:**
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/permission-request.ts`
- Modify: `frontend/src/core/threads/permission-request.test.ts`

- [ ] **Step 1: Write the failing union tests**

```typescript
void test("derivePendingPermissionRequest returns tool_permission kind", () => {
  ...
  assert.equal(pending?.approvalKind, "tool_permission");
});

void test("derivePendingPermissionRequest returns local_action_plan kind", () => {
  ...
  assert.equal(pending?.approvalKind, "local_action_plan");
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/threads/permission-request.test.ts
```

Expected:

- FAIL because `approvalKind` does not exist yet

- [ ] **Step 3: Introduce the discriminated union types**

```typescript
export type ToolPermissionRequest = {
  approvalKind: "tool_permission";
  ...
};

export type LocalActionPlanApprovalRequest = {
  approvalKind: "local_action_plan";
  reviewTitle?: string;
  reviewSummary?: string;
  ...
};

export type PendingApprovalRequest =
  | ToolPermissionRequest
  | LocalActionPlanApprovalRequest;
```

- [ ] **Step 4: Upgrade parser with compatibility fallback**

Requirements:

- prefer explicit `approval_kind`
- fallback to `tool_name === "local_actions_review"` only when `approval_kind` is absent

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/threads/permission-request.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/core/threads/types.ts \
  frontend/src/core/threads/permission-request.ts \
  frontend/src/core/threads/permission-request.test.ts
git commit -m "refactor: model pending approval requests as a union"
```

---

## Task 5: Render approval requests by kind in frontend messages

**Files:**
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/permission-request-card.tsx`
- Modify: `frontend/src/components/workspace/messages/local-actions-review-card.tsx`
- Modify: `frontend/src/components/workspace/messages/permission-request.contract.test.ts`
- Modify: `frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts`

- [ ] **Step 1: Write the failing render contract tests**

```typescript
void test("message list dispatches approval cards by approvalKind", async () => {
  ...
  assert.match(source, /pendingPermissionRequest\.approvalKind === "local_action_plan"/);
  assert.match(source, /pendingPermissionRequest\.approvalKind === "tool_permission"/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test \
  frontend/src/components/workspace/messages/permission-request.contract.test.ts \
  frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts
```

Expected:

- FAIL because current code still branches on `toolName`

- [ ] **Step 3: Switch rendering to `approvalKind`**

Requirements:

- generic tool approval card no longer needs to know about `local_actions_review`
- local-actions review card accepts only `local_action_plan` request type

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test \
  frontend/src/components/workspace/messages/permission-request.contract.test.ts \
  frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/messages/message-list.tsx \
  frontend/src/components/workspace/messages/permission-request-card.tsx \
  frontend/src/components/workspace/messages/local-actions-review-card.tsx \
  frontend/src/components/workspace/messages/permission-request.contract.test.ts \
  frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts
git commit -m "refactor: render approval cards by approval kind"
```

---

## Task 6: Switch desktop bridge runtime to typed approval results

**Files:**
- Modify: `desktop/src/main/bridge/nion-thread-client.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Modify: `desktop/tests/nion-thread-client-behavior.test.mjs`
- Modify: `desktop/tests/bridge-manager-behavior.test.mjs`

- [ ] **Step 1: Write the failing bridge typed-result tests**

```javascript
test("nion thread client exposes approval_kind on resolvePermission", async () => {
  ...
  assert.equal(result.approval_kind, "local_action_plan");
});

test("bridge manager dispatches local action execution by approval_kind", async () => {
  ...
  assert.equal(result.approval_kind, "local_action_plan");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test \
  desktop/tests/nion-thread-client-behavior.test.mjs \
  desktop/tests/bridge-manager-behavior.test.mjs
```

Expected:

- FAIL because bridge runtime still keys off `tool_name`

- [ ] **Step 3: Upgrade desktop bridge client and manager**

Requirements:

- `ResolveBridgePermissionResult` should expose:

```typescript
approval_kind?: "tool_permission" | "local_action_plan";
tool_permission_result?: {...};
local_action_result?: {...};
```

- bridge manager should branch on `approval_kind`
- retain temporary fallback to `tool_name === "local_actions_review"` during migration

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test \
  desktop/tests/nion-thread-client-behavior.test.mjs \
  desktop/tests/bridge-manager-behavior.test.mjs
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  desktop/src/main/bridge/nion-thread-client.ts \
  desktop/src/main/bridge/bridge-manager.ts \
  desktop/tests/nion-thread-client-behavior.test.mjs \
  desktop/tests/bridge-manager-behavior.test.mjs
git commit -m "refactor: switch bridge approvals to typed results"
```

---

## Task 7: Remove migration fallbacks after all typed paths are green

**Files:**
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `frontend/src/core/threads/permission-request.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Write the failing cleanup test**

```typescript
void test("local-actions review no longer depends on tool_name fallback", async () => {
  const source = await readFile(
    new URL("../../../core/threads/permission-request.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /toolName === "local_actions_review"/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts
```

Expected:

- FAIL because compatibility fallback still exists

- [ ] **Step 3: Remove fallback branches**

Requirements:

- no UI or bridge routing should depend on `tool_name === "local_actions_review"`
- docs should describe approval typing as first-class behavior

- [ ] **Step 4: Run focused verification**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_approval_request_store.py \
  backend/tests/test_thread_permission_router.py \
  backend/tests/test_local_actions_approval_contract.py -q
```

Expected:

- PASS

Run:

```bash
/opt/homebrew/bin/node --test \
  desktop/tests/nion-thread-client-behavior.test.mjs \
  desktop/tests/bridge-manager-behavior.test.mjs \
  frontend/src/core/threads/permission-request.test.ts \
  frontend/src/components/workspace/messages/permission-request.contract.test.ts \
  frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/app/gateway/routers/threads.py \
  frontend/src/core/threads/permission-request.ts \
  desktop/src/main/bridge/bridge-manager.ts \
  README.md \
  backend/CLAUDE.md \
  docs/test/README.md
git commit -m "refactor: make approval kind the primary contract"
```

---

## Spec Coverage Check

This plan covers the architectural gap we identified:

- separates generic tool permission approvals from local-action plan approvals
- upgrades storage, route responses, frontend parsing, and bridge runtime
- preserves compatibility until all consumers are migrated

Still intentionally deferred:

- additional local-action capabilities
- richer provider-specific approval cards
- non-thread approval domains unrelated to tool/local-action execution

---

## Placeholder Scan

Checked for:

- `TBD`
- `TODO`
- vague “handle appropriately”
- missing commands
- missing code blocks

No placeholders remain in this plan.

---

## Type Consistency Check

Verified the plan uses the same canonical names throughout:

- `approval_kind`
- `tool_permission`
- `local_action_plan`
- `ThreadApprovalRequestRecord`
- `tool_permission_result`
- `local_action_result`

No conflicting naming remains across tasks.
