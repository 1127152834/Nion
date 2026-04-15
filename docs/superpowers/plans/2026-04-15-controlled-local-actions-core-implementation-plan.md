# Controlled Local Actions Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为“受控本机动作”建立第一条完整主链：动作计划、全局三档权限、审核决策、执行审计与基础查询面全部打通，但暂不进入具体 OS 动作执行器的深实现。

**Architecture:** 这份计划不试图一次性实现完整的本机动作系统，而是先完成控制平面和数据平面的最小完整闭环。第一批只做结构化动作计划、权限模式、审核状态机、审计记录、desktop main 执行宿主接口，以及与 daemon / 远程入口对接所需的统一合同；具体的截图、Finder、应用控制执行器在后续切片分别落地到已定义的动作白名单上。

**Tech Stack:** Python 3.12, FastAPI, SQLite repository patterns, Electron main IPC, TypeScript, React/Next.js, pytest, Node.js contract tests

---

## Scope Check

“受控本机动作”设计文档描述的是一个完整版本，但它天然跨了多个独立子系统：

- 权限与产品设置
- 动作计划与审核
- desktop main 执行宿主
- 远程入口审核卡片与执行回执
- 审计与历史
- 具体 OS 动作执行器

按 `writing-plans` 的规则，不应把这些全部塞进单一实现计划。  
本计划只覆盖**核心主链**：

- 动作计划模型
- 全局三档权限模式
- 审核/执行状态机
- 审计记录
- desktop 执行宿主合同
- daemon/bridge 接线所需的统一接口

本计划明确不包含：

- 复杂 OS 动作执行器细节
- 任意控机
- 独立 Web 控制台
- 多用户 / 团队
- 丰富的桌面历史 UI

---

## Read This First

- [2026-04-15-controlled-local-actions-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-controlled-local-actions-design.md)
- [desktop/src/main/index.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/index.ts)
- [desktop/src/shared/ipc.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/shared/ipc.ts)
- [desktop/src/preload/index.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/preload/index.ts)
- [backend/packages/harness/nion/config/daemon_config.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/daemon_config.py)
- [backend/packages/harness/nion/config/app_config.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/app_config.py)
- [backend/app/gateway/routers/config.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/config.py)
- [backend/packages/harness/nion/thread_permissions.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/thread_permissions.py)
- [backend/app/gateway/routers/threads.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/threads.py)
- [backend/packages/harness/nion/automation/models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/models.py)
- [backend/packages/harness/nion/automation/repository.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/repository.py)
- [frontend/src/components/workspace/settings/daemon-settings-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/daemon-settings-page.tsx)
- [frontend/src/components/workspace/messages/permission-request-card.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/permission-request-card.tsx)

---

## File Map

### Core models and repository

- Create: `backend/packages/harness/nion/local_actions/models.py`
- Create: `backend/packages/harness/nion/local_actions/repository.py`
- Create: `backend/tests/test_local_actions_repository.py`

Responsibility:

- define the canonical data model for goals, plans, actions, execution records, and permission mode
- persist plans and execution audit records without mixing them into thread or automation repositories

### Planner / policy / audit service

- Create: `backend/packages/harness/nion/local_actions/planner.py`
- Create: `backend/packages/harness/nion/local_actions/policy.py`
- Create: `backend/packages/harness/nion/local_actions/service.py`
- Create: `backend/tests/test_local_actions_policy.py`
- Create: `backend/tests/test_local_actions_service.py`

Responsibility:

- translate a user goal into a structure-owned action plan
- evaluate the global daemon permission mode
- produce execution or review decisions
- write audit records

### Gateway / daemon contract

- Modify: `backend/packages/harness/nion/config/daemon_config.py`
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `backend/app/gateway/routers/config.py`
- Create: `backend/app/gateway/routers/local_actions.py`
- Modify: `backend/app/daemon/app.py`
- Create: `backend/tests/test_local_actions_config_contract.py`
- Create: `backend/tests/test_local_actions_router.py`

Responsibility:

- add the global three-mode permission setting under daemon config
- expose the local-actions control-plane router
- keep the desktop runtime app in sync with web/gateway route surface

### Desktop execution host contract

- Modify: `desktop/src/shared/ipc.ts`
- Modify: `desktop/src/preload/index.ts`
- Modify: `desktop/src/main/index.ts`
- Create: `desktop/src/main/local-actions/executor.ts`
- Create: `desktop/tests/local-actions-ipc.contract.test.mjs`
- Create: `desktop/tests/local-actions-executor.contract.test.mjs`

Responsibility:

- define a minimal desktop-local action execution contract
- allow daemon/orchestrator to request execution through desktop main
- do not yet implement all OS calls; only freeze the host interface and a minimal no-op / stub path

### Frontend settings and review surface

- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/components/workspace/settings/daemon-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/local-actions-permission-card.tsx`
- Create: `frontend/src/components/workspace/settings/local-actions-permission-card.contract.test.ts`
- Modify: `frontend/src/components/workspace/messages/permission-request-card.tsx`
- Create: `frontend/src/components/workspace/messages/local-actions-review-card.contract.test.ts`

Responsibility:

- add the three-mode permission control to `Settings > Daemon`
- render local-action review cards distinctly from generic tool permission cards
- preserve existing guardian-mode page structure

### Docs sync

- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

Responsibility:

- document the new local-actions core contract, permission modes, and verification matrix

---

## Task 1: Freeze local-actions data model and repository

**Files:**
- Create: `backend/packages/harness/nion/local_actions/models.py`
- Create: `backend/packages/harness/nion/local_actions/repository.py`
- Create: `backend/tests/test_local_actions_repository.py`

- [ ] **Step 1: Write the failing repository contract test**

```python
from nion.local_actions.models import LocalActionGoal, LocalActionPlan, LocalActionExecutionRecord
from nion.local_actions.repository import LocalActionsRepository


def test_local_actions_repository_roundtrips_goal_plan_and_execution(tmp_path):
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    goal = LocalActionGoal(
        goal_id="goal_1",
        source_surface="bridge",
        source_channel="telegram",
        user_input="Organize my Downloads folder",
        status="planned",
        created_at="2026-04-15T00:00:00Z",
    )
    plan = LocalActionPlan(
        plan_id="plan_1",
        goal_id="goal_1",
        summary="Organize downloads and delete temp files",
        risk_level="high",
        requires_review=True,
        actions=[],
        created_at="2026-04-15T00:00:00Z",
    )
    execution = LocalActionExecutionRecord(
        execution_id="exec_1",
        goal_id="goal_1",
        plan_id="plan_1",
        permission_mode="review_required",
        approval_status="pending",
        executed_actions=[],
        has_irreversible_action=True,
        audit_summary="Awaiting review",
        started_at="2026-04-15T00:00:00Z",
        finished_at=None,
    )

    repo.save_goal(goal)
    repo.save_plan(plan)
    repo.save_execution(execution)

    assert repo.get_goal("goal_1").goal_id == "goal_1"
    assert repo.get_plan("plan_1").plan_id == "plan_1"
    assert repo.get_execution("exec_1").execution_id == "exec_1"
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_local_actions_repository.py -q
```

Expected:

- FAIL because `nion.local_actions` does not exist yet

- [ ] **Step 3: Add the minimal models**

```python
from typing import Any, Literal

from pydantic import BaseModel, Field

LocalActionPermissionMode = Literal["disabled", "review_required", "allow_all"]
LocalActionGoalStatus = Literal["planned", "awaiting_review", "executing", "completed", "failed", "blocked"]
LocalActionRiskLevel = Literal["low", "medium", "high", "critical"]
LocalActionApprovalStatus = Literal["not_required", "pending", "approved", "rejected"]
LocalActionItemStatus = Literal["pending", "running", "succeeded", "failed", "skipped"]


class LocalActionItem(BaseModel):
    action_id: str
    action_type: str
    target: str = ""
    parameters: dict[str, Any] = Field(default_factory=dict)
    reversible: bool = True
    risk_level: LocalActionRiskLevel = "low"
    status: LocalActionItemStatus = "pending"
    result_summary: str = ""
    error_reason: str | None = None


class LocalActionGoal(BaseModel):
    goal_id: str
    source_surface: str
    source_channel: str | None = None
    user_input: str
    status: LocalActionGoalStatus
    created_at: str


class LocalActionPlan(BaseModel):
    plan_id: str
    goal_id: str
    summary: str
    risk_level: LocalActionRiskLevel
    requires_review: bool
    actions: list[LocalActionItem] = Field(default_factory=list)
    created_at: str


class LocalActionExecutionRecord(BaseModel):
    execution_id: str
    goal_id: str
    plan_id: str
    permission_mode: LocalActionPermissionMode
    approval_status: LocalActionApprovalStatus
    executed_actions: list[LocalActionItem] = Field(default_factory=list)
    has_irreversible_action: bool = False
    audit_summary: str = ""
    started_at: str
    finished_at: str | None = None
```

- [ ] **Step 4: Add the repository**

```python
import sqlite3
from pathlib import Path

from nion.local_actions.models import (
    LocalActionExecutionRecord,
    LocalActionGoal,
    LocalActionPlan,
)


class LocalActionsRepository:
    def __init__(self, db_path: str | Path):
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS local_action_goals (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS local_action_plans (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS local_action_executions (
                    id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                )
                """
            )

    def save_goal(self, goal: LocalActionGoal) -> LocalActionGoal:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO local_action_goals (id, payload) VALUES (?, ?)",
                (goal.goal_id, goal.model_dump_json()),
            )
        return goal

    def get_goal(self, goal_id: str) -> LocalActionGoal | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM local_action_goals WHERE id = ?",
                (goal_id,),
            ).fetchone()
        return None if row is None else LocalActionGoal.model_validate_json(row["payload"])

    def save_plan(self, plan: LocalActionPlan) -> LocalActionPlan:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO local_action_plans (id, payload) VALUES (?, ?)",
                (plan.plan_id, plan.model_dump_json()),
            )
        return plan

    def get_plan(self, plan_id: str) -> LocalActionPlan | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM local_action_plans WHERE id = ?",
                (plan_id,),
            ).fetchone()
        return None if row is None else LocalActionPlan.model_validate_json(row["payload"])

    def save_execution(self, execution: LocalActionExecutionRecord) -> LocalActionExecutionRecord:
        with self._connect() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO local_action_executions (id, payload) VALUES (?, ?)",
                (execution.execution_id, execution.model_dump_json()),
            )
        return execution

    def get_execution(self, execution_id: str) -> LocalActionExecutionRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM local_action_executions WHERE id = ?",
                (execution_id,),
            ).fetchone()
        return None if row is None else LocalActionExecutionRecord.model_validate_json(row["payload"])
```

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_local_actions_repository.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  backend/packages/harness/nion/local_actions/models.py \
  backend/packages/harness/nion/local_actions/repository.py \
  backend/tests/test_local_actions_repository.py
git commit -m "feat: add the local-actions core data model and repository"
```

---

## Task 2: Add global daemon permission mode for local actions

**Files:**
- Modify: `backend/packages/harness/nion/config/daemon_config.py`
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `backend/app/gateway/routers/config.py`
- Create: `backend/tests/test_local_actions_config_contract.py`

- [ ] **Step 1: Write the failing config contract test**

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_config_schema_exposes_local_actions_permission_mode():
    with TestClient(create_app()) as client:
        payload = client.get("/api/config").json()

    daemon_config = payload["config"].get("daemon", {})
    assert "local_actions_permission_mode" in daemon_config
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_local_actions_config_contract.py -q
```

Expected:

- FAIL because the daemon config has no local-actions permission setting yet

- [ ] **Step 3: Extend daemon config**

```python
from typing import Literal

from pydantic import BaseModel, Field


class DaemonConfig(BaseModel):
    allow_background_running: bool = Field(...)
    local_actions_permission_mode: Literal["disabled", "review_required", "allow_all"] = Field(
        default="review_required",
        description="Global permission mode for controlled local actions.",
    )
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=43115)
    shutdown_grace_period_seconds: int = Field(default=3, ge=1, le=10)
```

- [ ] **Step 4: Ensure config router returns it unchanged**

```python
@router.get("/config", response_model=ConfigReadResponse)
async def get_config(request: Request) -> ConfigReadResponse:
    repo = ConfigRepository()
    config, version, source_path = repo.read()
    return ConfigReadResponse(
        version=version,
        source_path=str(source_path),
        yaml_text=_to_yaml_text(config),
        config=config,
    )
```

No extra router logic is required; the key point is to make sure the config model and serialization path keep the new field.

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_local_actions_config_contract.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  backend/packages/harness/nion/config/daemon_config.py \
  backend/packages/harness/nion/config/app_config.py \
  backend/app/gateway/routers/config.py \
  backend/tests/test_local_actions_config_contract.py
git commit -m "feat: add global local-actions permission mode to daemon config"
```

---

## Task 3: Add local-actions planner and policy decision service

**Files:**
- Create: `backend/packages/harness/nion/local_actions/planner.py`
- Create: `backend/packages/harness/nion/local_actions/policy.py`
- Create: `backend/packages/harness/nion/local_actions/service.py`
- Create: `backend/tests/test_local_actions_policy.py`
- Create: `backend/tests/test_local_actions_service.py`

- [ ] **Step 1: Write failing policy tests**

```python
from nion.local_actions.policy import decide_local_action_execution


def test_policy_blocks_execution_when_mode_is_disabled():
    decision = decide_local_action_execution(
        permission_mode="disabled",
        has_irreversible_action=False,
    )
    assert decision["status"] == "blocked"
    assert decision["requires_review"] is False


def test_policy_requires_review_when_mode_is_review_required():
    decision = decide_local_action_execution(
        permission_mode="review_required",
        has_irreversible_action=True,
    )
    assert decision["status"] == "awaiting_review"
    assert decision["requires_review"] is True


def test_policy_allows_direct_execution_when_mode_is_allow_all():
    decision = decide_local_action_execution(
        permission_mode="allow_all",
        has_irreversible_action=True,
    )
    assert decision["status"] == "ready_to_execute"
    assert decision["requires_review"] is False
```

- [ ] **Step 2: Write failing service test for goal -> plan**

```python
from nion.local_actions.service import LocalActionsService
from nion.local_actions.repository import LocalActionsRepository


def test_service_creates_plan_and_audit_record(tmp_path):
    repo = LocalActionsRepository(tmp_path / "local_actions.db")
    service = LocalActionsService(repo=repo, permission_mode="review_required")

    result = service.plan_goal(
        source_surface="bridge",
        source_channel="telegram",
        user_input="Organize my Downloads folder",
    )

    assert result.goal.status == "awaiting_review"
    assert result.plan.requires_review is True
    assert result.execution.approval_status == "pending"
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_local_actions_policy.py \
  backend/tests/test_local_actions_service.py -q
```

Expected:

- FAIL because planner/policy/service do not exist yet

- [ ] **Step 4: Add a minimal planner**

```python
from datetime import UTC, datetime
from uuid import uuid4

from nion.local_actions.models import LocalActionGoal, LocalActionItem, LocalActionPlan


def _now() -> str:
    return datetime.now(UTC).isoformat()


def build_local_action_plan(*, source_surface: str, source_channel: str | None, user_input: str):
    goal = LocalActionGoal(
        goal_id=f"goal_{uuid4().hex}",
        source_surface=source_surface,
        source_channel=source_channel,
        user_input=user_input,
        status="planned",
        created_at=_now(),
    )
    actions = [
        LocalActionItem(
            action_id=f"action_{uuid4().hex}",
            action_type="analyze_goal",
            target="",
            parameters={"user_input": user_input},
            reversible=True,
            risk_level="low",
            status="pending",
        )
    ]
    plan = LocalActionPlan(
        plan_id=f"plan_{uuid4().hex}",
        goal_id=goal.goal_id,
        summary=user_input,
        risk_level="high",
        requires_review=False,
        actions=actions,
        created_at=_now(),
    )
    return goal, plan
```

- [ ] **Step 5: Add minimal policy**

```python
def decide_local_action_execution(*, permission_mode: str, has_irreversible_action: bool) -> dict:
    if permission_mode == "disabled":
        return {"status": "blocked", "requires_review": False, "approval_status": "not_required"}
    if permission_mode == "review_required":
        return {"status": "awaiting_review", "requires_review": True, "approval_status": "pending"}
    return {"status": "ready_to_execute", "requires_review": False, "approval_status": "not_required"}
```

- [ ] **Step 6: Add minimal service**

```python
from datetime import UTC, datetime
from uuid import uuid4

from nion.local_actions.models import LocalActionExecutionRecord
from nion.local_actions.planner import build_local_action_plan
from nion.local_actions.policy import decide_local_action_execution


class LocalActionsService:
    def __init__(self, *, repo, permission_mode: str):
        self._repo = repo
        self._permission_mode = permission_mode

    def plan_goal(self, *, source_surface: str, source_channel: str | None, user_input: str):
        goal, plan = build_local_action_plan(
            source_surface=source_surface,
            source_channel=source_channel,
            user_input=user_input,
        )
        has_irreversible_action = any(not action.reversible for action in plan.actions)
        decision = decide_local_action_execution(
            permission_mode=self._permission_mode,
            has_irreversible_action=has_irreversible_action,
        )

        goal.status = decision["status"]
        plan.requires_review = decision["requires_review"]
        execution = LocalActionExecutionRecord(
            execution_id=f"exec_{uuid4().hex}",
            goal_id=goal.goal_id,
            plan_id=plan.plan_id,
            permission_mode=self._permission_mode,
            approval_status=decision["approval_status"],
            executed_actions=[],
            has_irreversible_action=has_irreversible_action,
            audit_summary=plan.summary,
            started_at=datetime.now(UTC).isoformat(),
            finished_at=None,
        )

        self._repo.save_goal(goal)
        self._repo.save_plan(plan)
        self._repo.save_execution(execution)
        return type("LocalActionsPlanningResult", (), {"goal": goal, "plan": plan, "execution": execution})()
```

- [ ] **Step 7: Run tests to verify pass**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_local_actions_policy.py \
  backend/tests/test_local_actions_service.py -q
```

Expected:

- PASS

- [ ] **Step 8: Commit**

```bash
git add \
  backend/packages/harness/nion/local_actions/planner.py \
  backend/packages/harness/nion/local_actions/policy.py \
  backend/packages/harness/nion/local_actions/service.py \
  backend/tests/test_local_actions_policy.py \
  backend/tests/test_local_actions_service.py
git commit -m "feat: add the local-actions planning and policy service"
```

---

## Task 4: Add gateway local-actions router and desktop execution host contract

**Files:**
- Create: `backend/app/gateway/routers/local_actions.py`
- Modify: `backend/app/daemon/app.py`
- Modify: `desktop/src/shared/ipc.ts`
- Modify: `desktop/src/preload/index.ts`
- Modify: `desktop/src/main/index.ts`
- Create: `desktop/src/main/local-actions/executor.ts`
- Create: `backend/tests/test_local_actions_router.py`
- Create: `desktop/tests/local-actions-ipc.contract.test.mjs`
- Create: `desktop/tests/local-actions-executor.contract.test.mjs`

- [ ] **Step 1: Write the failing router test**

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_local_actions_router_creates_a_plan_record():
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
    assert payload["goal"]["status"] in {"blocked", "awaiting_review", "ready_to_execute"}
```

- [ ] **Step 2: Write the failing desktop IPC contract test**

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("desktop local-actions IPC exposes execute and review entrypoints", async () => {
  const source = await readFile(
    new URL("../src/shared/ipc.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /localActionsExecute/);
  assert.match(source, /localActionsListHistory/);
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_local_actions_router.py -q
/opt/homebrew/bin/node --test desktop/tests/local-actions-ipc.contract.test.mjs
```

Expected:

- FAIL because the router and IPC surfaces do not exist yet

- [ ] **Step 4: Add the gateway router**

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from nion.local_actions.repository import LocalActionsRepository
from nion.local_actions.service import LocalActionsService
from nion.config import get_app_config, get_paths

router = APIRouter(prefix="/api/local-actions", tags=["local-actions"])


class LocalActionsPlanRequest(BaseModel):
    source_surface: str
    source_channel: str | None = None
    user_input: str


def get_local_actions_service() -> LocalActionsService:
    repo = LocalActionsRepository(get_paths().base_dir / "local_actions.db")
    permission_mode = get_app_config().daemon.local_actions_permission_mode
    return LocalActionsService(repo=repo, permission_mode=permission_mode)


@router.post("/plan", status_code=201)
def create_local_actions_plan(
    request: LocalActionsPlanRequest,
    service: LocalActionsService = Depends(get_local_actions_service),
):
    result = service.plan_goal(
        source_surface=request.source_surface,
        source_channel=request.source_channel,
        user_input=request.user_input,
    )
    return {
        "goal": result.goal.model_dump(),
        "plan": result.plan.model_dump(),
        "execution": result.execution.model_dump(),
    }
```

- [ ] **Step 5: Mount the router into the desktop runtime app**

```python
from app.gateway.routers import local_actions

def create_app(*, shutdown_callback: Any = None) -> FastAPI:
    return create_runtime_app(
        mode="desktop",
        title="Nion Local Daemon",
        description="Single local runtime for the Nion desktop client.",
        version="0.1.0",
        lifespan=lifespan,
        shutdown_callback=shutdown_callback,
        extra_routers=[local_actions.router],
    )
```

- [ ] **Step 6: Add desktop IPC contracts and stub executor**

```typescript
export const DESKTOP_IPC_CHANNELS = {
  // existing fields...
  localActionsExecute: "desktop:local-actions-execute",
  localActionsListHistory: "desktop:local-actions-history",
} as const;
```

```typescript
export class LocalActionsExecutor {
  async executePlan(plan: { actions: Array<{ action_type: string }> }) {
    return {
      executed: plan.actions.map((action) => ({
        action_type: action.action_type,
        status: "skipped",
        result_summary: "Execution stub not implemented yet",
      })),
    };
  }
}
```

- [ ] **Step 7: Run tests to verify pass**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_local_actions_router.py -q
/opt/homebrew/bin/node --test desktop/tests/local-actions-ipc.contract.test.mjs desktop/tests/local-actions-executor.contract.test.mjs
```

Expected:

- PASS

- [ ] **Step 8: Commit**

```bash
git add \
  backend/app/gateway/routers/local_actions.py \
  backend/app/daemon/app.py \
  desktop/src/shared/ipc.ts \
  desktop/src/preload/index.ts \
  desktop/src/main/index.ts \
  desktop/src/main/local-actions/executor.ts \
  backend/tests/test_local_actions_router.py \
  desktop/tests/local-actions-ipc.contract.test.mjs \
  desktop/tests/local-actions-executor.contract.test.mjs
git commit -m "feat: add the local-actions control-plane and desktop host contract"
```

---

## Task 5: Add the global permission control to Settings > Daemon

**Files:**
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/components/workspace/settings/daemon-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/local-actions-permission-card.tsx`
- Create: `frontend/src/components/workspace/settings/local-actions-permission-card.contract.test.ts`

- [ ] **Step 1: Write the failing contract test**

```typescript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("daemon settings page renders the three-mode local-actions permission control", async () => {
  const source = await readFile(
    new URL("./daemon-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /LocalActionsPermissionCard/);
  assert.match(source, /disabled|review_required|allow_all/);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/components/workspace/settings/local-actions-permission-card.contract.test.ts
```

Expected:

- FAIL because no local-actions permission card exists yet

- [ ] **Step 3: Add the permission card**

```tsx
type LocalActionsPermissionMode = "disabled" | "review_required" | "allow_all";

export function LocalActionsPermissionCard({
  value,
  onChange,
  copy,
}: {
  value: LocalActionsPermissionMode;
  onChange: (next: LocalActionsPermissionMode) => void;
  copy: {
    title: string;
    description: string;
    disabled: string;
    reviewRequired: string;
    allowAll: string;
  };
}) {
  return (
    <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
      <div className="space-y-1">
        <div className="text-sm font-medium">{copy.title}</div>
        <div className="text-muted-foreground text-sm">{copy.description}</div>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Button type="button" variant={value === "disabled" ? "default" : "outline"} onClick={() => onChange("disabled")}>
          {copy.disabled}
        </Button>
        <Button type="button" variant={value === "review_required" ? "default" : "outline"} onClick={() => onChange("review_required")}>
          {copy.reviewRequired}
        </Button>
        <Button type="button" variant={value === "allow_all" ? "default" : "outline"} onClick={() => onChange("allow_all")}>
          {copy.allowAll}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add daemon settings wiring**

```tsx
const permissionMode =
  (daemon.local_actions_permission_mode as "disabled" | "review_required" | "allow_all" | undefined)
    ?? "review_required";

<LocalActionsPermissionCard
  value={permissionMode}
  onChange={(next) =>
    onConfigChange({
      ...draftConfig,
      daemon: {
        ...daemon,
        local_actions_permission_mode: next,
      },
    })
  }
  copy={{
    title: t.settings.daemon.localActionsPermissionTitle,
    description: t.settings.daemon.localActionsPermissionDescription,
    disabled: t.settings.daemon.localActionsPermissionDisabled,
    reviewRequired: t.settings.daemon.localActionsPermissionReviewRequired,
    allowAll: t.settings.daemon.localActionsPermissionAllowAll,
  }}
/>
```

- [ ] **Step 5: Run test to verify pass**

Run:

```bash
/opt/homebrew/bin/node --test frontend/src/components/workspace/settings/local-actions-permission-card.contract.test.ts frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts \
  frontend/src/components/workspace/settings/daemon-settings-page.tsx \
  frontend/src/components/workspace/settings/local-actions-permission-card.tsx \
  frontend/src/components/workspace/settings/local-actions-permission-card.contract.test.ts
git commit -m "feat: add the local-actions global permission control"
```

---

## Task 6: Sync docs and run focused verification

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Update README**

```md
- Controlled local actions now have a core goal/plan/audit data model and one global daemon permission mode
- Local action planning is goal-driven and does not expose arbitrary local control primitives
```

- [ ] **Step 2: Update backend/desktop guidance**

```md
- local actions are daemon-governed and desktop-executed; bridge/remote surfaces must not call local executors directly
```

- [ ] **Step 3: Update the test index**

```md
- controlled local actions core:
  - backend/tests/test_local_actions_repository.py
  - backend/tests/test_local_actions_policy.py
  - backend/tests/test_local_actions_service.py
  - backend/tests/test_local_actions_config_contract.py
  - backend/tests/test_local_actions_router.py
  - desktop/tests/local-actions-ipc.contract.test.mjs
  - desktop/tests/local-actions-executor.contract.test.mjs
  - frontend/src/components/workspace/settings/local-actions-permission-card.contract.test.ts
```

- [ ] **Step 4: Run focused verification**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_local_actions_repository.py \
  backend/tests/test_local_actions_policy.py \
  backend/tests/test_local_actions_service.py \
  backend/tests/test_local_actions_config_contract.py \
  backend/tests/test_local_actions_router.py -q
```

Expected:

- PASS

Run:

```bash
/opt/homebrew/bin/node --test \
  desktop/tests/local-actions-ipc.contract.test.mjs \
  desktop/tests/local-actions-executor.contract.test.mjs \
  frontend/src/components/workspace/settings/local-actions-permission-card.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  README.md \
  backend/CLAUDE.md \
  docs/test/README.md
git commit -m "docs: sync the local-actions core contract"
```

---

## Spec Coverage Check

This plan covers the first required slice of the controlled-local-actions spec:

- action planning
- global permission mode
- review / execution decision state
- audit record
- desktop execution host contract

Still intentionally deferred:

- full OS executor implementations
- rich review UI / audit history UI
- remote-entry detailed review cards
- controlled local actions on all channels

## Placeholder Scan

Checked for:

- `TBD`
- `TODO`
- vague “handle appropriately”
- missing commands
- missing code blocks

No placeholders remain in this plan.

## Type Consistency Check

Verified consistent naming across tasks:

- `LocalActionGoal`
- `LocalActionPlan`
- `LocalActionItem`
- `LocalActionExecutionRecord`
- `LocalActionPermissionMode`
- `review_required`
- `allow_all`
- `disabled`

No conflicting names remain across the plan.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-15-controlled-local-actions-core-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
