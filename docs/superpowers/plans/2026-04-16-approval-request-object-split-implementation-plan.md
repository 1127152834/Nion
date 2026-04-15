# Approval Request Object Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把通用工具权限审批和本机动作计划审批正式分型为一等 approval request 对象，同时保持现有 workspace / bridge / local-actions 审批闭环可回归。

**Architecture:** 保留现有 thread permission 主线，不新增第二套审批系统。存储层新增 typed approval record；通用工具审批继续拥有 `pending_allows` / `allow_session` 的工具重放语义；本机动作计划审批是计划级 one-shot 审批，拒绝或批准后都不写入 `pending_allows`，批准后只执行该 approval payload 中的结构化动作计划。迁移顺序是：后端 typed storage -> typed emit/resolve -> frontend typed union -> bridge typed dispatch -> 删除 `tool_name === "local_actions_review"` fallback。

**Tech Stack:** Python 3.12, FastAPI, dataclass + JSON persistence, TypeScript, React, Electron main/preload, pytest, Node.js contract tests

---

## Scope Check

这次计划只做审批对象分型和主线收口，不扩新的本机能力边界。

包含：

- `tool_permission` 与 `local_action_plan` 两种 approval kind
- thread-local approval 存储兼容迁移
- guardrail 通用工具审批 typed payload
- local-actions 计划审批 typed payload
- thread resolve typed response
- frontend discriminated union
- bridge runtime typed dispatch
- 删除 `tool_name === "local_actions_review"` 作为主分流条件

不包含：

- 新增本机动作白名单能力
- 新增 bridge provider 能力
- richer 富卡片视觉设计
- 任意控机 / 任意 shell / 任意鼠标键盘能力

---

## Semantic Contract

### Approval Kinds

`tool_permission`

- 用于通用工具调用审批，例如 `bash`、CLI install、受策略限制的工具调用。
- 允许 `allow`、`allow_session`、`deny`。
- `allow` 继续写入 `pending_allows`，用于一次性放行同一 `tool_name + tool_input` 签名。
- `allow_session` 继续写入 `thread_profiles[thread_id] = "full_access"`。
- resolve 后可选择重放原用户消息。

`local_action_plan`

- 用于本机动作计划审批，例如截图、整理下载目录、打开目录。
- 允许 `allow` 和 `deny`；迁移期如果收到 `allow_session`，后端按 `allow` 处理，但响应中返回 `decision: "allow"`，不写入 `thread_profiles`。
- 永远不写入 `pending_allows`。
- 批准后只执行当前 approval payload 中的 `local_action_payload.actions`，不重放原始用户消息。
- 拒绝后写入本机动作 execution audit：`approval_status="rejected"`，目标状态 `blocked`。

### Event Contract

迁移期间仍使用外层 tool message 名称 `permission_request`，但 payload 必须显式携带：

```json
{
  "approval_kind": "tool_permission"
}
```

或：

```json
{
  "approval_kind": "local_action_plan"
}
```

frontend 和 bridge 必须优先读 `approval_kind`；旧 `tool_name === "local_actions_review"` 只能作为迁移期 fallback，最后一个任务删除。

---

## File Map

### Backend Approval Domain

- Create: `backend/packages/harness/nion/approval_requests.py`
- Modify: `backend/packages/harness/nion/thread_permissions.py`
- Create: `backend/tests/test_approval_request_store.py`
- Modify: `backend/tests/test_thread_permissions_store.py`

Responsibility:

- define `ThreadApprovalRequestRecord`
- persist typed approvals in the existing `thread_permissions.json` store
- preserve old function names as compatibility wrappers
- keep tool-specific pending allow/session semantics out of local-action plan approvals

### Backend Emitters / Routers

- Modify: `backend/packages/harness/nion/guardrails/middleware.py`
- Modify: `backend/app/gateway/routers/local_actions.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/tests/test_guardrail_middleware.py`
- Modify: `backend/tests/test_tool_runtime_permission_contract.py`
- Modify: `backend/tests/test_thread_permission_router.py`
- Create: `backend/tests/test_local_actions_approval_contract.py`

Responsibility:

- emit `tool_permission` payloads from guardrails
- emit `local_action_plan` approval metadata from local-actions planning
- resolve approvals with typed response payloads

### Frontend Approval Model

- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/permission-request.ts`
- Modify: `frontend/src/core/threads/permission-request.test.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/permission-request-card.tsx`
- Modify: `frontend/src/components/workspace/messages/local-actions-review-card.tsx`
- Modify: `frontend/src/components/workspace/messages/permission-request.contract.test.ts`
- Modify: `frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts`

Responsibility:

- parse typed approval payloads into a discriminated union
- render generic tool and local action approvals by `approvalKind`
- stop leaking local-actions through generic `toolInput`

### Desktop Bridge Runtime

- Modify: `desktop/src/main/bridge/nion-thread-client.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Modify: `desktop/tests/nion-thread-client-behavior.test.mjs`
- Modify: `desktop/tests/bridge-manager-behavior.test.mjs`

Responsibility:

- consume typed approval resolve responses
- dispatch local action execution by `approval_kind`
- preserve generic tool permission flow

### Docs

- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

Responsibility:

- document that approval is now a typed domain, not a tool-name convention

---

## Task 1: Introduce typed approval request records

**Files:**
- Create: `backend/packages/harness/nion/approval_requests.py`
- Modify: `backend/packages/harness/nion/thread_permissions.py`
- Create: `backend/tests/test_approval_request_store.py`
- Modify: `backend/tests/test_thread_permissions_store.py`

- [ ] **Step 1: Write the failing approval request tests**

Add `backend/tests/test_approval_request_store.py`:

```python
from __future__ import annotations

import json

from nion.thread_permissions import (
    consume_thread_pending_allow,
    create_thread_approval_request,
    create_thread_permission_request,
    get_thread_approval_request,
    get_thread_permission_profile,
    resolve_thread_approval_request,
)


def test_tool_permission_approval_roundtrips_and_preserves_pending_allow(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_approval_request(
        thread_id="thread-tool",
        approval_kind="tool_permission",
        tool_name="bash",
        tool_input={"command": "echo hi"},
        original_message_text="run bash",
    )
    resolved = resolve_thread_approval_request(
        thread_id="thread-tool",
        approval_request_id=request.id,
        decision="allow",
    )

    assert resolved is not None
    assert resolved.approval_kind == "tool_permission"
    assert resolved.status == "allow"
    assert consume_thread_pending_allow(
        thread_id="thread-tool",
        tool_name="bash",
        tool_input={"command": "echo hi"},
    ) is True


def test_local_action_plan_approval_does_not_create_pending_allow_or_session_profile(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_approval_request(
        thread_id="thread-local-actions",
        approval_kind="local_action_plan",
        local_action_payload={
            "execution_id": "exec-1",
            "plan_id": "plan-1",
            "actions": [
                {"action_type": "capture_active_window", "target": "active_window"}
            ],
        },
        original_message_text="帮我截图",
    )
    resolved = resolve_thread_approval_request(
        thread_id="thread-local-actions",
        approval_request_id=request.id,
        decision="allow_session",
    )

    assert resolved is not None
    assert resolved.approval_kind == "local_action_plan"
    assert resolved.status == "allow"
    assert get_thread_permission_profile("thread-local-actions") == "default"
    assert consume_thread_pending_allow(
        thread_id="thread-local-actions",
        tool_name="local_actions_review",
        tool_input={"execution_id": "exec-1"},
    ) is False


def test_legacy_permission_request_records_read_as_tool_permission(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))
    store_path = tmp_path / "nion-home" / "thread_permissions.json"
    store_path.parent.mkdir(parents=True)
    store_path.write_text(
        json.dumps(
            {
                "requests": [
                    {
                        "id": "perm-legacy",
                        "thread_id": "thread-legacy",
                        "tool_name": "bash",
                        "tool_input": {"command": "echo hi"},
                        "original_message_text": "run bash",
                        "replay_payload": {"text": "run bash", "files": [], "additional_kwargs": {}},
                        "status": "pending",
                        "created_at": "2026-04-16T00:00:00Z",
                        "resolved_at": None,
                        "consumed": False,
                    }
                ],
                "thread_profiles": {},
                "pending_allows": [],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    loaded = get_thread_approval_request(
        thread_id="thread-legacy",
        approval_request_id="perm-legacy",
    )

    assert loaded is not None
    assert loaded.approval_kind == "tool_permission"
    assert loaded.tool_name == "bash"


def test_legacy_create_thread_permission_request_sets_tool_permission_kind(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))

    request = create_thread_permission_request(
        thread_id="thread-wrapper",
        tool_name="bash",
        tool_input={"command": "pwd"},
        original_message_text="pwd",
    )
    loaded = get_thread_approval_request(
        thread_id="thread-wrapper",
        approval_request_id=request.id,
    )

    assert loaded is not None
    assert loaded.approval_kind == "tool_permission"
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_approval_request_store.py -q
```

Expected:

- FAIL with import errors for `create_thread_approval_request` / `ThreadApprovalRequestRecord`

- [ ] **Step 3: Create `approval_requests.py`**

Add `backend/packages/harness/nion/approval_requests.py`:

```python
from __future__ import annotations

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


def normalize_approval_kind(raw: Any, *, tool_name: str | None = None) -> ApprovalRequestKind:
    if raw == "local_action_plan":
        return "local_action_plan"
    if raw == "tool_permission":
        return "tool_permission"
    if tool_name == "local_actions_review":
        return "local_action_plan"
    return "tool_permission"
```

- [ ] **Step 4: Replace `thread_permissions.py` internals with typed storage**

Update `backend/packages/harness/nion/thread_permissions.py` so it imports `ThreadApprovalRequestRecord`, persists `approval_kind`, and exposes these functions:

```python
def create_thread_approval_request(
    *,
    thread_id: str,
    approval_kind: ApprovalRequestKind,
    original_message_text: str,
    tool_name: str | None = None,
    tool_input: dict[str, Any] | None = None,
    local_action_payload: dict[str, Any] | None = None,
    replay_payload: dict[str, Any] | None = None,
) -> ThreadApprovalRequestRecord:
    store = _read_store()
    record = ThreadApprovalRequestRecord(
        id=f"approval_{uuid.uuid4().hex}",
        thread_id=thread_id,
        approval_kind=approval_kind,
        original_message_text=original_message_text,
        replay_payload=replay_payload
        or {
            "text": original_message_text,
            "files": [],
            "additional_kwargs": {},
        },
        status="pending",
        created_at=_now_iso(),
        tool_name=tool_name,
        tool_input=tool_input,
        local_action_payload=local_action_payload,
    )
    store["requests"].append(asdict(record))
    _write_store(store)
    return record


def resolve_thread_approval_request(
    *,
    thread_id: str,
    approval_request_id: str,
    decision: PermissionDecision,
) -> ThreadApprovalRequestRecord | None:
    store = _read_store()
    for item in store["requests"]:
        if item["id"] != approval_request_id or item["thread_id"] != thread_id:
            continue
        approval_kind = normalize_approval_kind(
            item.get("approval_kind"),
            tool_name=item.get("tool_name"),
        )
        if item["status"] != "pending":
            item["approval_kind"] = approval_kind
            return ThreadApprovalRequestRecord(**item)

        normalized_decision = (
            "allow"
            if approval_kind == "local_action_plan" and decision == "allow_session"
            else decision
        )
        item["approval_kind"] = approval_kind
        item["status"] = normalized_decision
        item["resolved_at"] = _now_iso()

        if approval_kind == "tool_permission" and normalized_decision == "allow_session":
            store["thread_profiles"][thread_id] = "full_access"
        elif approval_kind == "tool_permission" and normalized_decision == "allow":
            store["pending_allows"].append(
                {
                    "thread_id": thread_id,
                    "tool_name": item["tool_name"],
                    "tool_input_signature": _normalize_tool_input(item["tool_input"] or {}),
                    "permission_request_id": approval_request_id,
                }
            )

        _write_store(store)
        return ThreadApprovalRequestRecord(**item)
    return None


def get_thread_approval_request(
    *,
    thread_id: str,
    approval_request_id: str,
) -> ThreadApprovalRequestRecord | None:
    store = _read_store()
    for item in store["requests"]:
        if item["id"] != approval_request_id or item["thread_id"] != thread_id:
            continue
        item.setdefault(
            "replay_payload",
            {
                "text": item.get("original_message_text", ""),
                "files": [],
                "additional_kwargs": {},
            },
        )
        item["approval_kind"] = normalize_approval_kind(
            item.get("approval_kind"),
            tool_name=item.get("tool_name"),
        )
        return ThreadApprovalRequestRecord(**item)
    return None
```

Implementation requirements:

- `local_action_plan + allow_session` must be normalized to stored status `"allow"`.
- `tool_permission + allow_session` must keep existing `thread_profiles[thread_id] = "full_access"`.
- `tool_permission + allow` must keep existing `pending_allows` behavior.
- `local_action_plan` must never write to `pending_allows`.
- `get_thread_approval_request()` must accept old rows without `approval_kind`.

Keep wrappers:

```python
ThreadPermissionRequestRecord = ThreadApprovalRequestRecord

def create_thread_permission_request(
    *,
    thread_id: str,
    tool_name: str,
    tool_input: dict[str, Any],
    original_message_text: str,
    replay_payload: dict[str, Any] | None = None,
):
    return create_thread_approval_request(
        thread_id=thread_id,
        approval_kind="tool_permission",
        tool_name=tool_name,
        tool_input=tool_input,
        original_message_text=original_message_text,
        replay_payload=replay_payload,
    )

def resolve_thread_permission_request(
    *,
    thread_id: str,
    permission_request_id: str,
    decision: PermissionDecision,
):
    return resolve_thread_approval_request(
        thread_id=thread_id,
        approval_request_id=permission_request_id,
        decision=decision,
    )

def get_thread_permission_request(
    *,
    thread_id: str,
    permission_request_id: str,
):
    return get_thread_approval_request(
        thread_id=thread_id,
        approval_request_id=permission_request_id,
    )
```

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
  backend/tests/test_approval_request_store.py \
  backend/tests/test_thread_permissions_store.py
git commit -m "refactor: introduce typed approval request records"
```

---

## Task 2: Emit typed approval payloads from guardrails and local-actions

**Files:**
- Modify: `backend/packages/harness/nion/guardrails/middleware.py`
- Modify: `backend/app/gateway/routers/local_actions.py`
- Modify: `backend/tests/test_guardrail_middleware.py`
- Create: `backend/tests/test_local_actions_approval_contract.py`

- [ ] **Step 1: Write the failing guardrail payload assertion**

In `backend/tests/test_guardrail_middleware.py`, extend the existing permission request payload test to assert:

```python
payload = tool_message.additional_kwargs["permission_request"]
assert payload["approval_kind"] == "tool_permission"
assert payload["tool_permission_result"] == {
    "tool_name": payload["tool_name"],
    "tool_input": payload["tool_input"],
}
```

- [ ] **Step 2: Write the failing local-actions approval contract test**

Add `backend/tests/test_local_actions_approval_contract.py`:

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.config.app_config import reset_app_config
from nion.config.extensions_config import reset_extensions_config


def test_local_actions_plan_returns_typed_local_action_plan_approval(monkeypatch, tmp_path):
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text('{"mcpServers": {}, "skills": {}}', encoding="utf-8")

    monkeypatch.delenv("NION_CONFIG_PATH", raising=False)
    monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
    monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))
    monkeypatch.setenv("NION_HOME", str(tmp_path / ".nion-data"))
    reset_app_config()
    reset_extensions_config()

    try:
        with TestClient(create_app()) as client:
            response = client.post(
                "/api/local-actions/plan",
                json={
                    "source_surface": "bridge",
                    "source_channel": "telegram",
                    "user_input": "Organize my Downloads folder",
                },
            )

        assert response.status_code == 201
        payload = response.json()
        assert payload["execution"]["approval_status"] == "pending"
        approval = payload["approval_request"]
        assert approval["approval_kind"] == "local_action_plan"
        assert approval["local_action_result"]["execution_id"] == payload["execution"]["execution_id"]
        assert approval["local_action_result"]["plan_id"] == payload["plan"]["plan_id"]
        assert approval["local_action_result"]["actions"] == payload["plan"]["actions"]
        assert "tool_permission_result" not in approval
    finally:
        reset_app_config()
        reset_extensions_config()
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_guardrail_middleware.py \
  backend/tests/test_local_actions_approval_contract.py -q
```

Expected:

- FAIL because `approval_kind` and typed result fields are not emitted yet

- [ ] **Step 4: Update guardrail middleware**

In `backend/packages/harness/nion/guardrails/middleware.py`, replace the call to `create_thread_permission_request()` with:

```python
permission_request = create_thread_approval_request(
    thread_id=thread_id,
    approval_kind="tool_permission",
    tool_name=tool_name,
    tool_input=tool_input,
    original_message_text=original_message_text,
    replay_payload=replay_payload,
)
```

The emitted `permission_request` payload must include:

```python
"approval_kind": "tool_permission",
"tool_permission_result": {
    "tool_name": tool_name,
    "tool_input": tool_input,
},
```

Keep during migration:

```python
"tool_name": tool_name,
"tool_input": tool_input,
```

- [ ] **Step 5: Update local-actions plan response**

In `backend/app/gateway/routers/local_actions.py`, extend `LocalActionsPlanResponse`:

```python
class LocalActionsPlanResponse(BaseModel):
    goal: dict
    plan: dict
    execution: dict
    approval_request: dict | None = None
```

Update `_serialize_result()` to include `approval_request` only when `execution.approval_status == "pending"`:

```python
def _build_local_action_approval_request(result: LocalActionsPlanningResult) -> dict[str, Any] | None:
    if result.execution.approval_status != "pending":
        return None
    irreversible_count = sum(1 for action in result.plan.actions if not action.reversible)
    actions = [action.model_dump(mode="json") for action in result.plan.actions]
    return {
        "id": f"approval_{result.execution.execution_id}",
        "approval_kind": "local_action_plan",
        "local_action_result": {
            "goal_id": result.goal.goal_id,
            "plan_id": result.plan.plan_id,
            "execution_id": result.execution.execution_id,
            "summary": result.plan.summary,
            "risk_level": result.plan.risk_level,
            "irreversible_action_count": irreversible_count,
            "actions": actions,
        },
        "local_action_payload": {
            "goal_id": result.goal.goal_id,
            "plan_id": result.plan.plan_id,
            "execution_id": result.execution.execution_id,
            "summary": result.plan.summary,
            "risk_level": result.plan.risk_level,
            "irreversible_action_count": irreversible_count,
            "actions": actions,
        },
    }
```

- [ ] **Step 6: Run tests to verify pass**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_guardrail_middleware.py \
  backend/tests/test_tool_runtime_permission_contract.py \
  backend/tests/test_local_actions_approval_contract.py -q
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```bash
git add \
  backend/packages/harness/nion/guardrails/middleware.py \
  backend/app/gateway/routers/local_actions.py \
  backend/tests/test_guardrail_middleware.py \
  backend/tests/test_local_actions_approval_contract.py
git commit -m "refactor: emit typed approval request payloads"
```

---

## Task 3: Return typed approval resolve responses

**Files:**
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/tests/test_thread_permission_router.py`

- [ ] **Step 1: Write failing resolve response tests**

In `backend/tests/test_thread_permission_router.py`, add:

```python
def test_workspace_permission_resolve_returns_tool_permission_result(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))
    repository = ThreadRepository(base_dir=tmp_path / "nion-home")
    repository.upsert_thread("thread-tool-kind", values={"messages": [], "artifacts": []})

    request = create_thread_permission_request(
        thread_id="thread-tool-kind",
        tool_name="bash",
        tool_input={"command": "echo hi"},
        original_message_text="run bash",
    )

    with TestClient(create_app()) as client:
        response = client.post(
            f"/api/threads/thread-tool-kind/permissions/{request.id}/resolve",
            json={"decision": "allow"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["approval_kind"] == "tool_permission"
    assert payload["tool_permission_result"] == {
        "tool_name": "bash",
        "tool_input": {"command": "echo hi"},
    }


def test_bridge_permission_resolve_returns_local_action_plan_result(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path / "nion-home"))
    repository = ThreadRepository(base_dir=tmp_path / "nion-home")
    repository.upsert_thread(
        "thread-local-kind",
        values={
            "messages": [],
            "artifacts": [],
            "bridge": {"source": "bridge", "platform": "telegram", "chatId": "123"},
        },
    )

    request = create_thread_approval_request(
        thread_id="thread-local-kind",
        approval_kind="local_action_plan",
        local_action_payload={
            "execution_id": "exec-1",
            "plan_id": "plan-1",
            "actions": [{"action_type": "capture_active_window", "target": "active_window"}],
        },
        original_message_text="帮我截图",
    )

    with TestClient(create_app()) as client:
        response = client.post(
            f"/api/threads/thread-local-kind/bridge/permissions/{request.id}/resolve",
            json={"decision": "allow_session"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["decision"] == "allow"
    assert payload["approval_kind"] == "local_action_plan"
    assert payload["local_action_result"] == {
        "execution_id": "exec-1",
        "plan_id": "plan-1",
        "actions": [{"action_type": "capture_active_window", "target": "active_window"}],
    }
    assert payload["local_actions"] == payload["local_action_result"]
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_thread_permission_router.py -q
```

Expected:

- FAIL because resolve responses do not include `approval_kind` / typed result fields yet

- [ ] **Step 3: Update `threads.py` resolve projection**

In `backend/app/gateway/routers/threads.py`, use `latest.approval_kind`.

For `tool_permission`, include:

```python
"approval_kind": "tool_permission",
"tool_permission_result": {
    "tool_name": latest.tool_name,
    "tool_input": latest.tool_input or {},
},
```

For `local_action_plan`, include:

```python
"approval_kind": "local_action_plan",
"local_action_result": {
    "execution_id": local_payload.get("execution_id"),
    "plan_id": local_payload.get("plan_id"),
    "actions": local_payload.get("actions", []),
},
"local_actions": same_result,
```

Keep migration fields:

```python
"tool_name": latest.tool_name if latest else "",
"local_actions": local_action_result
```

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

- [ ] **Step 1: Write failing union tests**

In `frontend/src/core/threads/permission-request.test.ts`, add:

```typescript
void test("derivePendingPermissionRequest returns tool_permission approval kind", () => {
  const pending = derivePendingPermissionRequest([
    {
      type: "tool",
      id: "tool-approval",
      name: "permission_request",
      content: "permission needed",
      additional_kwargs: {
        permission_request: {
          id: "perm-tool",
          approval_kind: "tool_permission",
          tool_name: "bash",
          tool_input: { command: "echo hi" },
          tool_permission_result: {
            tool_name: "bash",
            tool_input: { command: "echo hi" },
          },
          actions: [{ key: "allow", label: "Allow" }],
        },
      },
    },
  ]);

  assert.equal(pending?.approvalKind, "tool_permission");
  assert.equal(pending?.toolPermission.toolName, "bash");
});

void test("derivePendingPermissionRequest returns local_action_plan approval kind", () => {
  const pending = derivePendingPermissionRequest([
    {
      type: "tool",
      id: "tool-local",
      name: "permission_request",
      content: "review local actions",
      additional_kwargs: {
        permission_request: {
          id: "perm-local",
          approval_kind: "local_action_plan",
          reason_message: "Review before execution.",
          local_action_result: {
            execution_id: "exec-1",
            plan_id: "plan-1",
            actions: [{ action_type: "capture_active_window", target: "active_window" }],
          },
          actions: [{ key: "allow", label: "Approve" }, { key: "deny", label: "Reject" }],
        },
      },
    },
  ]);

  assert.equal(pending?.approvalKind, "local_action_plan");
  assert.equal(pending?.localActionPlan.executionId, "exec-1");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/core/threads/permission-request.test.ts
```

Expected:

- FAIL because `approvalKind`, `toolPermission`, and `localActionPlan` do not exist yet

- [ ] **Step 3: Update frontend types**

In `frontend/src/core/threads/types.ts`, define:

```typescript
type ApprovalAction = {
  key: "allow" | "allow_session" | "deny";
  label: string;
};

export type ToolPermissionApprovalRequest = {
  approvalKind: "tool_permission";
  toolMessageId?: string;
  toolCallId?: string;
  requestId: string;
  actions: ApprovalAction[];
  options: string[];
  reasonCode?: string;
  reasonMessage?: string;
  toolPermission: {
    toolName: string;
    toolInput: Record<string, unknown>;
  };
};

export type LocalActionPlanApprovalRequest = {
  approvalKind: "local_action_plan";
  toolMessageId?: string;
  toolCallId?: string;
  requestId: string;
  actions: ApprovalAction[];
  options: string[];
  reasonCode?: string;
  reasonMessage?: string;
  reviewTitle?: string;
  reviewSummary?: string;
  localActionPlan: {
    executionId: string;
    planId?: string;
    irreversibleActionCount?: number;
    actions: Array<Record<string, unknown>>;
  };
};

export type PendingPermissionRequest =
  | ToolPermissionApprovalRequest
  | LocalActionPlanApprovalRequest;
```

- [ ] **Step 4: Update parser**

In `frontend/src/core/threads/permission-request.ts`:

- read `approval_kind`
- if absent and `tool_name === "local_actions_review"`, treat as `"local_action_plan"` for migration
- normalize tool approvals into `toolPermission`
- normalize local action approvals into `localActionPlan`
- keep compatibility accessors only if TypeScript requires existing call sites

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

## Task 5: Render approval cards by approval kind

**Files:**
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/permission-request-card.tsx`
- Modify: `frontend/src/components/workspace/messages/local-actions-review-card.tsx`
- Modify: `frontend/src/components/workspace/messages/permission-request.contract.test.ts`
- Modify: `frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts`

- [ ] **Step 1: Write failing render contract tests**

In `frontend/src/components/workspace/messages/permission-request.contract.test.ts`, add:

```typescript
void test("message list dispatches approval cards by approvalKind", async () => {
  const source = await readFile(
    new URL("./message-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /pendingPermissionRequest\.approvalKind === "local_action_plan"/);
  assert.match(source, /pendingPermissionRequest\.approvalKind === "tool_permission"/);
  assert.doesNotMatch(source, /pendingPermissionRequest\.toolName === "local_actions_review"/);
});
```

In `frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts`, add:

```typescript
void test("local-actions review card reads localActionPlan instead of toolInput", async () => {
  const source = await readFile(
    new URL("./local-actions-review-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /permissionRequest\.localActionPlan/);
  assert.doesNotMatch(source, /permissionRequest\.toolInput/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test \
  frontend/src/components/workspace/messages/permission-request.contract.test.ts \
  frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts
```

Expected:

- FAIL because rendering still branches on `toolName` and local action card still reads `toolInput`

- [ ] **Step 3: Update message list and cards**

Requirements:

- `message-list.tsx` dispatches by `approvalKind`.
- `PermissionRequestCard` accepts only `ToolPermissionApprovalRequest`.
- `LocalActionsReviewCard` accepts only `LocalActionPlanApprovalRequest`.
- generic card renders `permissionRequest.toolPermission.toolName`.
- local action card renders `permissionRequest.localActionPlan`.

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

- [ ] **Step 1: Write failing typed bridge tests**

In `desktop/tests/nion-thread-client-behavior.test.mjs`, add:

```javascript
test("nion thread client exposes typed approval result fields", async () => {
  const createNionThreadClient = await loadThreadClientFactory();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        decision: "allow",
        approval_kind: "local_action_plan",
        local_action_result: {
          execution_id: "exec-1",
          plan_id: "plan-1",
          actions: [{ action_type: "capture_active_window", target: "active_window" }],
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const client = createNionThreadClient("http://127.0.0.1:43115");
  const result = await client.resolvePermission("thread-1", "approval-1", "allow");

  assert.equal(result.approval_kind, "local_action_plan");
  assert.equal(result.local_action_result.execution_id, "exec-1");

  globalThis.fetch = originalFetch;
});
```

In `desktop/tests/bridge-manager-behavior.test.mjs`, update the approved local-actions test so `resolvePermission()` returns:

```javascript
{
  ok: true,
  decision: "allow",
  approval_kind: "local_action_plan",
  local_action_result: {
    execution_id: "exec-1",
    actions: [{ action_type: "capture_active_window", target: "active_window" }],
  },
}
```

and assert bridge manager reads `local_action_result`.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test \
  desktop/tests/nion-thread-client-behavior.test.mjs \
  desktop/tests/bridge-manager-behavior.test.mjs
```

Expected:

- FAIL because bridge manager still keys local action execution off `tool_name` / `local_actions`

- [ ] **Step 3: Update bridge client and manager**

Requirements:

- `ResolveBridgePermissionResult` exposes:

```typescript
approval_kind?: "tool_permission" | "local_action_plan";
tool_permission_result?: {
  tool_name: string;
  tool_input: Record<string, unknown>;
};
local_action_result?: {
  execution_id: string;
  plan_id?: string;
  actions: Array<Record<string, unknown>>;
};
```

- bridge manager branches on:

```typescript
resolution.approval_kind === "local_action_plan"
```

- migration fallback:

```typescript
const localActionResult =
  resolution.local_action_result ?? resolution.local_actions;
```

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

## Task 7: Remove migration fallbacks and update docs

**Files:**
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `frontend/src/core/threads/permission-request.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Write failing cleanup tests**

Add to `frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts`:

```typescript
void test("local-actions review no longer depends on tool_name fallback", async () => {
  const source = await readFile(
    new URL("../../../core/threads/permission-request.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /toolName === "local_actions_review"/);
});
```

Add to `desktop/tests/bridge-manager-behavior.test.mjs`:

```javascript
test("bridge manager no longer dispatches local actions by tool_name fallback", async () => {
  const source = await readFile(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /tool_name === "local_actions_review"/);
  assert.doesNotMatch(source, /toolName === "local_actions_review"/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test \
  desktop/tests/bridge-manager-behavior.test.mjs \
  frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts
```

Expected:

- FAIL because compatibility fallbacks still exist

- [ ] **Step 3: Remove fallback branches**

Requirements:

- frontend parser no longer checks `tool_name === "local_actions_review"`
- bridge manager no longer checks `tool_name === "local_actions_review"`
- backend resolve response can keep `tool_name` for generic compatibility, but typed consumers must not depend on it

- [ ] **Step 4: Update docs**

Update:

- `README.md`: mention typed approval requests
- `backend/CLAUDE.md`: document `approval_kind` as primary contract
- `docs/test/README.md`: add approval request split tests

- [ ] **Step 5: Run final focused verification**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_approval_request_store.py \
  backend/tests/test_thread_permissions_store.py \
  backend/tests/test_thread_permission_router.py \
  backend/tests/test_local_actions_approval_contract.py \
  backend/tests/test_guardrail_middleware.py \
  backend/tests/test_tool_runtime_permission_contract.py -q
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

- [ ] **Step 6: Commit**

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

The review findings are covered as follows:

- local-action approval one-shot semantics: Semantic Contract + Task 1
- local-actions integration with thread message flow: Task 2 keeps outer `permission_request` during migration and types the payload
- no placeholder implementation steps: all previous omitted code snippets have been replaced with concrete test code or exact implementation requirements
- frontend union real fields: Task 4 defines `toolPermission` and `localActionPlan`
- bridge typed dispatch: Task 6 migrates to `approval_kind`

Still intentionally deferred:

- additional local-action capabilities
- provider-specific rich cards
- approval domains outside thread-based tool/local-action execution

---

## Placeholder Scan

Checked for placeholder terms in executable steps:

- `TBD`
- `TODO`
- omitted code snippets
- “same pattern”
- “handle appropriately”

No executable task step contains unresolved placeholders.

---

## Type Consistency Check

Canonical names:

- `approval_kind`
- `tool_permission`
- `local_action_plan`
- `ThreadApprovalRequestRecord`
- `tool_permission_result`
- `local_action_result`
- frontend `approvalKind`
- frontend `toolPermission`
- frontend `localActionPlan`

No conflicting names remain across tasks.
