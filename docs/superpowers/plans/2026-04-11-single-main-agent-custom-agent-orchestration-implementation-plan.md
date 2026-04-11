# Single Main Agent + Governed Custom-Agent Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前只能独立使用的 custom agent 演进成“唯一主智能体统一对外发声、custom agent 可被调度执行、child runs 可检查但不归档”的可落地系统。

**Architecture:** 这轮实现坚持一个原则：站内协同优先走 LangGraph 原生编排，remote coordination 才走 ACP/A2A transport seam。后端先建立 child-run 合同、delegation policy、orchestrator graph 和 delegated executor，再把前端从“主消息流里的 subtask 卡片”升级为“左侧可展开的临时 child runs + 详情检查器”。整个实施保持 TDD，小步提交，禁止把 custom agent 混进现有 built-in subagent registry。

**Tech Stack:** Python 3.12, FastAPI, Pydantic, LangChain/LangGraph, SQLite/JSON thread artifacts, React 19, TypeScript, TanStack Query, node:test, pytest

---

## Scope Check

这不是三个独立子系统，而是一个必须端到端打通的垂直切片：

- backend contract
- orchestration runtime
- sidebar/inspector UX

把它拆成多个互不感知的计划，会产生不可测试的中间态，所以保留成一个实施文档，但每个任务都保持独立、可提交、可回归。

## Read This First

- `.omx/plans/prd-single-main-agent-custom-agent-orchestration.md`
- `.omx/plans/test-spec-single-main-agent-custom-agent-orchestration.md`
- `backend/packages/harness/nion/threads/service.py`
- `backend/packages/harness/nion/threads/models.py`
- `backend/packages/harness/nion/tools/builtins/task_tool.py`
- `backend/packages/harness/nion/subagents/executor.py`
- `frontend/src/core/threads/hooks.ts`
- `frontend/src/components/workspace/recent-chat-list.tsx`
- `frontend/src/components/workspace/messages/message-list.tsx`

## File Map

### Backend orchestration contract

- Create: `backend/packages/harness/nion/orchestration/__init__.py`
- Create: `backend/packages/harness/nion/orchestration/models.py`
- Create: `backend/packages/harness/nion/orchestration/repository.py`
- Create: `backend/packages/harness/nion/orchestration/service.py`
- Create: `backend/packages/harness/nion/orchestration/mention_parser.py`
- Create: `backend/packages/harness/nion/orchestration/delegation_policy.py`
- Create: `backend/packages/harness/nion/orchestration/delegated_agent_executor.py`
- Create: `backend/packages/harness/nion/orchestration/graph.py`
- Create: `backend/packages/harness/nion/orchestration/remote_agent_transport.py`
- Create: `backend/packages/harness/nion/orchestration/remote_transports/__init__.py`
- Create: `backend/packages/harness/nion/orchestration/remote_transports/acp.py`
- Create: `backend/packages/harness/nion/orchestration/remote_transports/a2a.py`

### Backend integration points

- Modify: `backend/packages/harness/nion/config/paths.py`
- Modify: `backend/packages/harness/nion/config/agents_config.py`
- Modify: `backend/app/gateway/routers/agents.py`
- Modify: `backend/packages/harness/nion/threads/models.py`
- Modify: `backend/packages/harness/nion/threads/service.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`

### Frontend child-run state and UI

- Create: `frontend/src/core/child-runs/types.ts`
- Create: `frontend/src/core/child-runs/reducer.ts`
- Create: `frontend/src/core/child-runs/api.ts`
- Create: `frontend/src/core/child-runs/hooks.ts`
- Create: `frontend/src/components/workspace/child-runs/child-run-list.tsx`
- Create: `frontend/src/components/workspace/child-runs/child-run-inspector.tsx`
- Create: `frontend/src/components/workspace/messages/delegation-summary.tsx`
- Create: `frontend/src/components/workspace/recent-chat-list.child-runs.contract.test.ts`
- Create: `frontend/src/components/workspace/child-runs/child-run-inspector.contract.test.ts`

### Frontend integration points

- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/messages/utils.ts`
- Modify: `frontend/src/components/workspace/recent-chat-list.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`

### Tests and docs

- Create: `backend/tests/test_ephemeral_child_run_repository.py`
- Create: `backend/tests/test_thread_child_run_router.py`
- Create: `backend/tests/test_delegation_policy.py`
- Create: `backend/tests/test_mention_parser.py`
- Create: `backend/tests/test_orchestrator_graph.py`
- Create: `backend/tests/test_thread_service_delegation_stream.py`
- Create: `backend/tests/test_remote_agent_transport.py`
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `frontend/CLAUDE.md`
- Modify: `docs/test/README.md`

## Task 0: Preflight And Baseline

**Files:**
- Read only: `.omx/plans/prd-single-main-agent-custom-agent-orchestration.md`
- Read only: `.omx/plans/test-spec-single-main-agent-custom-agent-orchestration.md`

- [ ] **Step 1: Create or switch to a dedicated worktree**

Run:

```bash
git worktree list
git branch --show-current
```

Expected:

- You know the active worktree path
- You know the active branch name
- You are not implementing this in a dirty unrelated worktree by accident

- [ ] **Step 2: Snapshot current baseline tests before touching code**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_control_plane_logging_coverage.py -q
pnpm --dir frontend test:contracts -- src/components/workspace/recent-chat-list.contract.test.ts
pnpm --dir frontend typecheck
```

Expected:

- Existing targeted backend test passes
- Existing recent chat list contract passes
- Frontend typecheck passes

- [ ] **Step 3: Read the existing runtime boundaries before coding**

Read these files in order:

```text
backend/packages/harness/nion/threads/models.py
backend/packages/harness/nion/threads/service.py
backend/packages/harness/nion/tools/builtins/task_tool.py
backend/packages/harness/nion/subagents/executor.py
frontend/src/core/threads/hooks.ts
frontend/src/components/workspace/recent-chat-list.tsx
frontend/src/components/workspace/messages/message-list.tsx
```

- [ ] **Step 4: Write one sentence at the top of your scratchpad before coding**

Use this sentence verbatim:

```text
Do not model delegated custom agents as normal ThreadRecord entries or as built-in subagent registry members.
```

## Task 1: Establish Ephemeral Child-Run Storage Contracts

**Files:**
- Create: `backend/packages/harness/nion/orchestration/__init__.py`
- Create: `backend/packages/harness/nion/orchestration/models.py`
- Create: `backend/packages/harness/nion/orchestration/repository.py`
- Modify: `backend/packages/harness/nion/config/paths.py`
- Test: `backend/tests/test_ephemeral_child_run_repository.py`

- [ ] **Step 1: Write the failing repository tests**

```python
# backend/tests/test_ephemeral_child_run_repository.py
from nion.orchestration.models import ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


def test_child_run_repository_round_trips_record(tmp_path):
    repo = ChildRunRepository(base_dir=tmp_path)
    record = ChildRunRecord(
        child_run_id="child-1",
        parent_thread_id="thread-1",
        agent_name="research-agent",
        title="Research Agent",
        status="created",
        description="Collect source material",
    )

    repo.save(record)

    loaded = repo.list_for_thread("thread-1")
    assert [item.child_run_id for item in loaded] == ["child-1"]
    assert loaded[0].agent_name == "research-agent"


def test_closing_child_run_removes_it_from_open_listing(tmp_path):
    repo = ChildRunRepository(base_dir=tmp_path)
    record = ChildRunRecord(
        child_run_id="child-2",
        parent_thread_id="thread-1",
        agent_name="writer-agent",
        title="Writer Agent",
        status="running",
        description="Summarize research",
    )
    repo.save(record)

    repo.close("thread-1", "child-2")

    assert repo.list_open_for_thread("thread-1") == []
    assert repo.get("thread-1", "child-2").status == "closed"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_ephemeral_child_run_repository.py -q
```

Expected:

- FAIL because `nion.orchestration` package and child-run repository do not exist

- [ ] **Step 3: Implement the models, paths, and repository**

```python
# backend/packages/harness/nion/orchestration/models.py
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

ChildRunStatus = Literal["created", "running", "completed", "failed", "closed"]


class ChildRunMessage(BaseModel):
    role: Literal["human", "ai", "tool"]
    content: str
    created_at: str


class ChildRunRecord(BaseModel):
    child_run_id: str
    parent_thread_id: str
    agent_name: str
    title: str
    status: ChildRunStatus = "created"
    description: str = ""
    result: str | None = None
    error: str | None = None
    started_at: str = ""
    finished_at: str | None = None
    messages: list[ChildRunMessage] = Field(default_factory=list)
    tool_activity_timeline: list[dict[str, Any]] = Field(default_factory=list)
    artifacts: list[str] = Field(default_factory=list)
```

```python
# backend/packages/harness/nion/orchestration/repository.py
from __future__ import annotations

import json
from pathlib import Path

from nion.config.paths import Paths
from nion.memory_os.clock import utcnow_z
from nion.orchestration.models import ChildRunRecord


class ChildRunRepository:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = Paths(base_dir=base_dir)

    def _path(self, thread_id: str, child_run_id: str) -> Path:
        return self._paths.child_run_file(thread_id, child_run_id)

    def save(self, record: ChildRunRecord) -> ChildRunRecord:
        path = self._path(record.parent_thread_id, record.child_run_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(record.model_dump_json(indent=2), encoding="utf-8")
        return record

    def get(self, thread_id: str, child_run_id: str) -> ChildRunRecord:
        return ChildRunRecord.model_validate_json(
            self._path(thread_id, child_run_id).read_text(encoding="utf-8")
        )

    def list_for_thread(self, thread_id: str) -> list[ChildRunRecord]:
        root = self._paths.child_runs_dir(thread_id)
        if not root.exists():
            return []
        return sorted(
            (
                ChildRunRecord.model_validate_json(path.read_text(encoding="utf-8"))
                for path in root.glob("*.json")
            ),
            key=lambda item: item.started_at or item.child_run_id,
        )

    def list_open_for_thread(self, thread_id: str) -> list[ChildRunRecord]:
        return [item for item in self.list_for_thread(thread_id) if item.status != "closed"]

    def close(self, thread_id: str, child_run_id: str) -> ChildRunRecord:
        record = self.get(thread_id, child_run_id)
        updated = record.model_copy(
            update={"status": "closed", "finished_at": record.finished_at or utcnow_z()}
        )
        return self.save(updated)
```

```python
# backend/packages/harness/nion/config/paths.py
    def child_runs_dir(self, thread_id: str) -> Path:
        return self.thread_dir(thread_id) / "child-runs"

    def child_run_file(self, thread_id: str, child_run_id: str) -> Path:
        if not _SAFE_THREAD_ID_RE.match(child_run_id):
            raise ValueError(
                f"Invalid child_run_id {child_run_id!r}: only alphanumeric characters, hyphens, and underscores are allowed."
            )
        return self.child_runs_dir(thread_id) / f"{child_run_id}.json"
```

- [ ] **Step 4: Run the repository tests to verify they pass**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_ephemeral_child_run_repository.py -q
```

Expected:

- PASS with `2 passed`

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/paths.py \
  backend/packages/harness/nion/orchestration/__init__.py \
  backend/packages/harness/nion/orchestration/models.py \
  backend/packages/harness/nion/orchestration/repository.py \
  backend/tests/test_ephemeral_child_run_repository.py
git commit -F - <<'EOF'
Persist ephemeral child-run records outside formal thread history

Create a dedicated storage contract for temporary child runs so
delegated agent execution stays inspectable without polluting normal
thread search or recent chat history.

Constraint: Child runs must never become ThreadRecord entries
Rejected: Reuse thread.json for child runs | would pollute recent chats and search
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep child-run persistence under the parent thread directory and out of ThreadRepository.search
Tested: backend/.venv/bin/python -m pytest backend/tests/test_ephemeral_child_run_repository.py -q
Not-tested: Router and frontend consumption
EOF
```

## Task 2: Expose Child-Run API Without Changing Formal Thread Search

**Files:**
- Create: `backend/packages/harness/nion/orchestration/service.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Test: `backend/tests/test_thread_child_run_router.py`

- [ ] **Step 1: Write the failing router tests**

```python
# backend/tests/test_thread_child_run_router.py
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.orchestration.models import ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


def test_threads_router_lists_child_runs(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = ChildRunRepository(base_dir=tmp_path)
    repo.save(
        ChildRunRecord(
            child_run_id="child-1",
            parent_thread_id="thread-1",
            agent_name="research-agent",
            title="Research Agent",
            status="running",
            description="Collect source material",
        )
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/threads/thread-1/child-runs")

    assert response.status_code == 200
    body = response.json()
    assert [item["child_run_id"] for item in body["items"]] == ["child-1"]


def test_threads_search_does_not_return_child_runs(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        response = client.post("/api/threads/search", json={"scope": "all", "limit": 50})

    assert response.status_code == 200
    assert all("child_run_id" not in item for item in response.json())
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_thread_child_run_router.py -q
```

Expected:

- FAIL because `/api/threads/{thread_id}/child-runs` route does not exist

- [ ] **Step 3: Implement child-run service and thread endpoints**

```python
# backend/packages/harness/nion/orchestration/service.py
from __future__ import annotations

from nion.orchestration.repository import ChildRunRepository


class ChildRunService:
    def __init__(self, repository: ChildRunRepository | None = None) -> None:
        self._repository = repository or ChildRunRepository()

    def list_open(self, thread_id: str):
        return self._repository.list_open_for_thread(thread_id)

    def get(self, thread_id: str, child_run_id: str):
        return self._repository.get(thread_id, child_run_id)

    def close(self, thread_id: str, child_run_id: str):
        return self._repository.close(thread_id, child_run_id)
```

```python
# backend/app/gateway/routers/threads.py
class ChildRunListResponse(BaseModel):
    items: list[dict[str, Any]]


@router.get("/{thread_id}/child-runs", response_model=ChildRunListResponse)
async def list_child_runs(thread_id: str) -> ChildRunListResponse:
    from nion.orchestration.service import ChildRunService

    service = ChildRunService()
    return ChildRunListResponse(
        items=[item.model_dump() for item in service.list_open(thread_id)]
    )


@router.get("/{thread_id}/child-runs/{child_run_id}")
async def get_child_run(thread_id: str, child_run_id: str) -> dict[str, Any]:
    from nion.orchestration.service import ChildRunService

    return ChildRunService().get(thread_id, child_run_id).model_dump()


@router.post("/{thread_id}/child-runs/{child_run_id}/close")
async def close_child_run(thread_id: str, child_run_id: str) -> dict[str, Any]:
    from nion.orchestration.service import ChildRunService

    return ChildRunService().close(thread_id, child_run_id).model_dump()
```

- [ ] **Step 4: Run the router tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_thread_child_run_router.py -q
```

Expected:

- PASS with `2 passed`

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/orchestration/service.py \
  backend/app/gateway/routers/threads.py \
  backend/tests/test_thread_child_run_router.py
git commit -F - <<'EOF'
Expose child-run inspection endpoints without changing thread search

Add a dedicated child-run read surface under the existing threads
router while keeping formal thread search blind to temporary child
execution artifacts.

Constraint: threads/search must stay reserved for formal thread history
Rejected: Add child runs as a new ThreadScope | still leaks temporary runs into thread semantics
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep child-run API nested under parent thread routes but outside ThreadRecord storage
Tested: backend/.venv/bin/python -m pytest backend/tests/test_thread_child_run_router.py -q
Not-tested: Orchestrator runtime writes
EOF
```

## Task 3: Extend Agent Config With Delegation Policy

**Files:**
- Create: `backend/packages/harness/nion/orchestration/delegation_policy.py`
- Modify: `backend/packages/harness/nion/config/agents_config.py`
- Modify: `backend/app/gateway/routers/agents.py`
- Test: `backend/tests/test_delegation_policy.py`

- [ ] **Step 1: Write the failing policy tests**

```python
# backend/tests/test_delegation_policy.py
from nion.config.agents_config import AgentConfig, AgentDelegationConfig
from nion.orchestration.delegation_policy import build_delegated_execution_profile


def test_delegated_execution_profile_denies_direct_user_reply_by_default():
    agent = AgentConfig(
        name="research-agent",
        delegation=AgentDelegationConfig(
            allow_direct_user_reply=False,
            allow_memory_write=False,
            private_skills=["search-web", "rank-sources"],
            delegatable_private_skills=["search-web"],
        ),
    )

    profile = build_delegated_execution_profile(
        agent,
        caller_permissions={"web_search", "write_file"},
    )

    assert profile.allow_direct_user_reply is False
    assert profile.allow_memory_write is False
    assert profile.allowed_private_skills == ["search-web"]
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_delegation_policy.py -q
```

Expected:

- FAIL because `AgentDelegationConfig` and `build_delegated_execution_profile()` do not exist

- [ ] **Step 3: Implement delegation config and policy builder**

```python
# backend/packages/harness/nion/config/agents_config.py
from pydantic import BaseModel, Field


class AgentDelegationConfig(BaseModel):
    allow_direct_user_reply: bool = False
    allow_memory_write: bool = False
    private_skills: list[str] = Field(default_factory=list)
    delegatable_private_skills: list[str] = Field(default_factory=list)


class AgentConfig(BaseModel):
    name: str
    description: str = ""
    model: str | None = None
    tool_groups: list[str] | None = None
    id: str | None = None
    slug: str | None = None
    kind: str = "custom"
    visibility: str = "internal"
    can_delete: bool = True
    can_edit: bool = True
    entrypoint: str | None = None
    tool_policy: str | None = None
    soul: str | None = None
    delegation: AgentDelegationConfig = Field(default_factory=AgentDelegationConfig)
```

```python
# backend/packages/harness/nion/orchestration/delegation_policy.py
from __future__ import annotations

from pydantic import BaseModel, Field

from nion.config.agents_config import AgentConfig


class DelegatedExecutionProfile(BaseModel):
    agent_name: str
    allow_direct_user_reply: bool = False
    allow_memory_write: bool = False
    allowed_private_skills: list[str] = Field(default_factory=list)
    soul_overlay: str = (
        "You are running as a delegated custom agent. "
        "Do not address the user directly. Return your work to the main agent."
    )
    effective_permissions: list[str] = Field(default_factory=list)


def build_delegated_execution_profile(
    agent_config: AgentConfig,
    *,
    caller_permissions: set[str],
) -> DelegatedExecutionProfile:
    allowed_private_skills = [
        skill
        for skill in agent_config.delegation.delegatable_private_skills
        if skill in agent_config.delegation.private_skills
    ]
    return DelegatedExecutionProfile(
        agent_name=agent_config.name,
        allow_direct_user_reply=agent_config.delegation.allow_direct_user_reply,
        allow_memory_write=agent_config.delegation.allow_memory_write,
        allowed_private_skills=allowed_private_skills,
        effective_permissions=sorted(caller_permissions),
    )
```

```python
# backend/app/gateway/routers/agents.py
class AgentCreateRequest(BaseModel):
    name: str
    description: str = ""
    model: str | None = None
    tool_groups: list[str] | None = None
    soul: str = ""
    delegation: dict | None = None
```

- [ ] **Step 4: Run the policy tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_delegation_policy.py -q
```

Expected:

- PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/agents_config.py \
  backend/app/gateway/routers/agents.py \
  backend/packages/harness/nion/orchestration/delegation_policy.py \
  backend/tests/test_delegation_policy.py
git commit -F - <<'EOF'
Add explicit delegation policy for custom agents

Teach agent config how to describe delegated behavior so permissions,
private skills, and memory write defaults are deterministic before the
orchestrator graph starts dispatching child runs.

Constraint: Delegated execution must default to main-agent-mediated replies and no long-term writes
Rejected: Infer delegation policy ad hoc from tool groups | too implicit for security-critical behavior
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep delegation policy explicit in AgentConfig instead of sprinkling defaults across runtime call sites
Tested: backend/.venv/bin/python -m pytest backend/tests/test_delegation_policy.py -q
Not-tested: End-to-end agent CRUD UI support for the new fields
EOF
```

## Task 4: Build Mention Parsing And LangGraph Orchestrator Skeleton

**Files:**
- Create: `backend/packages/harness/nion/orchestration/mention_parser.py`
- Create: `backend/packages/harness/nion/orchestration/graph.py`
- Test: `backend/tests/test_mention_parser.py`
- Test: `backend/tests/test_orchestrator_graph.py`

- [ ] **Step 1: Write the failing parser and graph tests**

```python
# backend/tests/test_mention_parser.py
from nion.orchestration.mention_parser import parse_agent_mentions


def test_parse_agent_mentions_preserves_chain_order():
    steps = parse_agent_mentions("@agent-1 搜索资料，然后交给 @agent-2 总结，再交给 @agent-3 排版")
    assert [step.agent_name for step in steps] == ["agent-1", "agent-2", "agent-3"]
```

```python
# backend/tests/test_orchestrator_graph.py
from langgraph.checkpoint.memory import InMemorySaver

from nion.orchestration.graph import build_agent_orchestrator_graph


def test_orchestrator_graph_short_circuits_when_no_mentions():
    graph = build_agent_orchestrator_graph(checkpointer=InMemorySaver())
    result = graph.invoke({"user_text": "普通单智能体问题", "thread_id": "thread-1"})
    assert result["mode"] == "lead_only"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_mention_parser.py \
  backend/tests/test_orchestrator_graph.py -q
```

Expected:

- FAIL because parser and graph modules do not exist

- [ ] **Step 3: Implement parser and graph skeleton**

```python
# backend/packages/harness/nion/orchestration/mention_parser.py
from __future__ import annotations

import re
from pydantic import BaseModel

MENTION_RE = re.compile(r"@(?P<agent>[A-Za-z0-9-]+)")


class MentionedAgentStep(BaseModel):
    agent_name: str
    ordinal: int


def parse_agent_mentions(text: str) -> list[MentionedAgentStep]:
    return [
        MentionedAgentStep(agent_name=match.group("agent"), ordinal=index)
        for index, match in enumerate(MENTION_RE.finditer(text), start=1)
    ]
```

```python
# backend/packages/harness/nion/orchestration/graph.py
from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from nion.orchestration.mention_parser import parse_agent_mentions


class OrchestrationState(TypedDict, total=False):
    thread_id: str
    user_text: str
    mode: str
    mention_steps: list[dict]
    final_reply: str


def parse_mentions_node(state: OrchestrationState):
    steps = [step.model_dump() for step in parse_agent_mentions(state["user_text"])]
    return {"mention_steps": steps, "mode": "delegated" if steps else "lead_only"}


def plan_agent_chain_node(state: OrchestrationState):
    return state


def dispatch_child_runs(state: OrchestrationState):
    if state.get("mode") != "delegated":
        return "finish"
    return [Send("run_child_agent", {"step": step, "thread_id": state["thread_id"]}) for step in state["mention_steps"]]


def run_child_agent(state: dict):
    return {"child_results": [state["step"]["agent_name"]]}


def synthesize_node(state: OrchestrationState):
    if state.get("mode") == "lead_only":
        return {"final_reply": "", "mode": "lead_only"}
    return {"final_reply": "delegated", "mode": "delegated"}


def build_agent_orchestrator_graph(*, checkpointer):
    builder = StateGraph(OrchestrationState)
    builder.add_node("parse_mentions", parse_mentions_node)
    builder.add_node("plan_agent_chain", plan_agent_chain_node)
    builder.add_node("run_child_agent", run_child_agent)
    builder.add_node("synthesize", synthesize_node)
    builder.add_edge(START, "parse_mentions")
    builder.add_edge("parse_mentions", "plan_agent_chain")
    builder.add_conditional_edges("plan_agent_chain", dispatch_child_runs, ["run_child_agent", "finish"])
    builder.add_edge("run_child_agent", "synthesize")
    builder.add_edge("synthesize", END)
    builder.add_edge("plan_agent_chain", "synthesize")
    return builder.compile(checkpointer=checkpointer)
```

- [ ] **Step 4: Run the parser and graph tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_mention_parser.py \
  backend/tests/test_orchestrator_graph.py -q
```

Expected:

- PASS with `2 passed`

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/orchestration/mention_parser.py \
  backend/packages/harness/nion/orchestration/graph.py \
  backend/tests/test_mention_parser.py \
  backend/tests/test_orchestrator_graph.py
git commit -F - <<'EOF'
Add mention parsing and the initial LangGraph orchestration skeleton

Create the minimum graph surface needed to route plain turns away from
delegated turns and to preserve mention order for later child-run
dispatch.

Constraint: Local orchestration must be graph-first, not another task-tool wrapper
Rejected: Extend task() to accept custom-agent names | keeps the wrong runtime boundary alive
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep Send/subgraph/checkpointer concepts in the graph layer even if the first implementation is minimal
Tested: backend/.venv/bin/python -m pytest backend/tests/test_mention_parser.py backend/tests/test_orchestrator_graph.py -q
Not-tested: Real delegated execution
EOF
```

## Task 5: Implement Delegated Agent Execution And Thread-Service Routing

**Files:**
- Create: `backend/packages/harness/nion/orchestration/delegated_agent_executor.py`
- Modify: `backend/packages/harness/nion/threads/service.py`
- Test: `backend/tests/test_thread_service_delegation_stream.py`

- [ ] **Step 1: Write the failing thread-service stream test**

```python
# backend/tests/test_thread_service_delegation_stream.py
from collections.abc import Generator

from nion.client import StreamEvent
from nion.threads.service import ThreadService


class FakeExecutor:
    def stream(self, **kwargs) -> Generator[StreamEvent, None, None]:
        yield StreamEvent(type="custom", data={"type": "child_run_created", "child_run_id": "child-1"})
        yield StreamEvent(type="custom", data={"type": "child_run_completed", "child_run_id": "child-1", "result": "done"})
        yield StreamEvent(type="values", data={"title": "Delegated", "messages": [], "artifacts": []})


def test_thread_service_routes_mentioned_turns_to_delegated_executor(monkeypatch):
    service = ThreadService()
    service._delegated_executor = FakeExecutor()  # noqa: SLF001

    request = service._build_request_for_test(  # add this helper in the implementation step
        text="@research-agent 搜索这个问题",
        context={"thread_id": "thread-1"},
    )
    events = list(service.stream("thread-1", request))

    assert any(event.type == "custom" and event.data["type"] == "child_run_created" for event in events)
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_thread_service_delegation_stream.py -q
```

Expected:

- FAIL because `ThreadService` does not route delegated turns to a dedicated executor

- [ ] **Step 3: Implement delegated executor and routing**

```python
# backend/packages/harness/nion/orchestration/delegated_agent_executor.py
from __future__ import annotations

import uuid
from collections.abc import Generator

from nion.client import NionClient, StreamEvent
from nion.memory_os.clock import utcnow_z
from nion.orchestration.models import ChildRunMessage, ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


class DelegatedAgentExecutor:
    def __init__(self, *, repository: ChildRunRepository | None = None) -> None:
        self._repository = repository or ChildRunRepository()

    def stream(
        self,
        *,
        parent_thread_id: str,
        agent_name: str,
        prompt: str,
        model_name: str | None = None,
    ) -> Generator[StreamEvent, None, None]:
        child_run_id = f"child-{uuid.uuid4().hex[:8]}"
        record = ChildRunRecord(
            child_run_id=child_run_id,
            parent_thread_id=parent_thread_id,
            agent_name=agent_name,
            title=agent_name,
            status="running",
            description=prompt,
            started_at=utcnow_z(),
        )
        self._repository.save(record)
        yield StreamEvent(type="custom", data={"type": "child_run_created", "child_run_id": child_run_id, "agent_name": agent_name})

        client = NionClient(agent_name=agent_name, subagent_enabled=False)
        final_text = ""
        for event in client.stream(
            prompt,
            thread_id=f"{parent_thread_id}-{child_run_id}",
            agent_name=agent_name,
            model_name=model_name,
            memory_write=False,
            session_mode="temporary_chat",
        ):
            if event.type == "messages-tuple" and event.data.get("type") == "ai":
                content = event.data.get("content", "")
                if isinstance(content, str) and content:
                    final_text = content
                    yield StreamEvent(
                        type="custom",
                        data={
                            "type": "child_run_running",
                            "child_run_id": child_run_id,
                            "message": content,
                        },
                    )

        completed = record.model_copy(update={"status": "completed", "result": final_text, "finished_at": utcnow_z()})
        self._repository.save(completed)
        yield StreamEvent(
            type="custom",
            data={"type": "child_run_completed", "child_run_id": child_run_id, "result": final_text},
        )
        self._repository.close(parent_thread_id, child_run_id)
        yield StreamEvent(type="custom", data={"type": "child_run_closed", "child_run_id": child_run_id})
```

```python
# backend/packages/harness/nion/threads/service.py
class ThreadService:
    def __init__(self, *, repository=None, client=None) -> None:
        self._repository = repository or ThreadRepository()
        self._client = client or NionClient()
        from nion.orchestration.delegated_agent_executor import DelegatedAgentExecutor
        self._delegated_executor = DelegatedAgentExecutor()

    def _build_request_for_test(self, *, text: str, context: dict[str, Any]) -> ThreadStreamRequest:
        return ThreadStreamRequest(
            messages=[{"type": "human", "content": [{"type": "text", "text": text}]}],
            context=context,
            config={},
        )

    def stream(self, thread_id: str, request: ThreadStreamRequest):
        message_text = _extract_message_text(request.messages)
        if "@" in message_text:
            mentioned = re.findall(r"@([A-Za-z0-9-]+)", message_text)
            if mentioned:
                for agent_name in mentioned:
                    yield from self._delegated_executor.stream(
                        parent_thread_id=thread_id,
                        agent_name=agent_name,
                        prompt=message_text,
                        model_name=request.context.get("model_name"),
                    )
                yield StreamEvent(type="values", data={"title": "Delegated", "messages": [], "artifacts": []})
                return
        ...
```

- [ ] **Step 4: Run the backend stream test**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_thread_service_delegation_stream.py -q
```

Expected:

- PASS with `1 passed`

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/orchestration/delegated_agent_executor.py \
  backend/packages/harness/nion/threads/service.py \
  backend/tests/test_thread_service_delegation_stream.py
git commit -F - <<'EOF'
Route mentioned turns through delegated custom-agent execution

Add a dedicated execution path for mentioned custom agents so child
runs can emit their own lifecycle events without becoming user-facing
threads or normal task-tool workers.

Constraint: Delegated custom agents must return work to the main agent and stay temporary
Rejected: Reuse built-in task tool lifecycle as-is | wrong identity boundary and wrong UI target
Confidence: medium
Scope-risk: moderate
Reversibility: clean
Directive: Keep delegated execution separate from both ThreadRepository and built-in subagent registry
Tested: backend/.venv/bin/python -m pytest backend/tests/test_thread_service_delegation_stream.py -q
Not-tested: Full orchestrator graph integration
EOF
```

## Task 6: Add Frontend Child-Run State, Reducer, And Fetch Hooks

**Files:**
- Create: `frontend/src/core/child-runs/types.ts`
- Create: `frontend/src/core/child-runs/reducer.ts`
- Create: `frontend/src/core/child-runs/api.ts`
- Create: `frontend/src/core/child-runs/hooks.ts`
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/hooks.ts`
- Test: `frontend/src/components/workspace/recent-chat-list.child-runs.contract.test.ts`

- [ ] **Step 1: Write the failing contract test for child-run state wiring**

```ts
// frontend/src/components/workspace/recent-chat-list.child-runs.contract.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread hooks and recent chat list wire child-run state into the sidebar", async () => {
  const hooksSource = await readFile(
    new URL("../../core/threads/hooks.ts", import.meta.url),
    "utf8",
  );
  const listSource = await readFile(
    new URL("./recent-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(hooksSource, /child_run_created/);
  assert.match(hooksSource, /child_run_completed/);
  assert.match(hooksSource, /reduceChildRunEvent/);
  assert.match(listSource, /childRuns/);
  assert.match(listSource, /ChildRunList/);
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

```bash
pnpm --dir frontend test:contracts -- src/components/workspace/recent-chat-list.child-runs.contract.test.ts
```

Expected:

- FAIL because child-run reducer, hook wiring, and sidebar component do not exist

- [ ] **Step 3: Implement child-run state and hook wiring**

```ts
// frontend/src/core/child-runs/types.ts
export type ChildRunStatus =
  | "created"
  | "running"
  | "completed"
  | "failed"
  | "closed";

export type ChildRunRecord = {
  child_run_id: string;
  agent_name: string;
  title: string;
  status: ChildRunStatus;
  description: string;
  result?: string;
  error?: string;
  latest_message?: string;
};
```

```ts
// frontend/src/core/child-runs/reducer.ts
import type { ChildRunRecord } from "./types";

type ChildRunEvent =
  | { type: "child_run_created"; child_run_id: string; agent_name: string }
  | { type: "child_run_running"; child_run_id: string; message: string }
  | { type: "child_run_completed"; child_run_id: string; result: string }
  | { type: "child_run_closed"; child_run_id: string };

export function reduceChildRunEvent(
  current: Record<string, ChildRunRecord>,
  event: ChildRunEvent,
): Record<string, ChildRunRecord> {
  if (event.type === "child_run_created") {
    return {
      ...current,
      [event.child_run_id]: {
        child_run_id: event.child_run_id,
        agent_name: event.agent_name,
        title: event.agent_name,
        status: "created",
        description: "",
      },
    };
  }
  const existing = current[event.child_run_id];
  if (!existing) return current;
  if (event.type === "child_run_running") {
    return {
      ...current,
      [event.child_run_id]: { ...existing, status: "running", latest_message: event.message },
    };
  }
  if (event.type === "child_run_completed") {
    return {
      ...current,
      [event.child_run_id]: { ...existing, status: "completed", result: event.result },
    };
  }
  return {
    ...current,
    [event.child_run_id]: { ...existing, status: "closed" },
  };
}
```

```ts
// frontend/src/core/threads/types.ts
  child_runs?: Record<string, import("../child-runs/types").ChildRunRecord>;
```

```ts
// frontend/src/core/threads/hooks.ts
import { reduceChildRunEvent } from "@/core/child-runs/reducer";

...

if (eventType === "custom" && typeof data?.type === "string" && data.type.startsWith("child_run_")) {
  setValues((current) => ({
    ...current,
    child_runs: reduceChildRunEvent(
      current.child_runs ?? {},
      data as Parameters<typeof reduceChildRunEvent>[1],
    ),
  }));
}
```

- [ ] **Step 4: Run the contract test and typecheck**

Run:

```bash
pnpm --dir frontend test:contracts -- src/components/workspace/recent-chat-list.child-runs.contract.test.ts
pnpm --dir frontend typecheck
```

Expected:

- Contract test PASS
- `tsc --noEmit` PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/core/child-runs/types.ts \
  frontend/src/core/child-runs/reducer.ts \
  frontend/src/core/child-runs/api.ts \
  frontend/src/core/child-runs/hooks.ts \
  frontend/src/core/threads/types.ts \
  frontend/src/core/threads/hooks.ts \
  frontend/src/components/workspace/recent-chat-list.child-runs.contract.test.ts
git commit -F - <<'EOF'
Track delegated child-run state in frontend thread data

Introduce a dedicated child-run reducer and thread state extension so
temporary delegated execution can be restored and rendered without
pretending those runs are normal messages or normal threads.

Constraint: Child-run state must survive refresh without entering formal recent chat history
Rejected: Reconstruct child runs only from assistant:subagent message groups | refresh and recovery would be brittle
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep child-run state explicit in thread values and avoid inferring lifecycle solely from message grouping
Tested: pnpm --dir frontend test:contracts -- src/components/workspace/recent-chat-list.child-runs.contract.test.ts; pnpm --dir frontend typecheck
Not-tested: Full sidebar rendering
EOF
```

## Task 7: Render Child Runs In The Sidebar And Inspect Them

**Files:**
- Create: `frontend/src/components/workspace/child-runs/child-run-list.tsx`
- Create: `frontend/src/components/workspace/child-runs/child-run-inspector.tsx`
- Create: `frontend/src/components/workspace/messages/delegation-summary.tsx`
- Modify: `frontend/src/components/workspace/recent-chat-list.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/core/messages/utils.ts`
- Test: `frontend/src/components/workspace/child-runs/child-run-inspector.contract.test.ts`

- [ ] **Step 1: Write the failing UI contract test**

```ts
// frontend/src/components/workspace/child-runs/child-run-inspector.contract.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("child run inspector is driven from the sidebar and the main message list keeps only a summary", async () => {
  const sidebarSource = await readFile(
    new URL("../recent-chat-list.tsx", import.meta.url),
    "utf8",
  );
  const inspectorSource = await readFile(
    new URL("./child-run-inspector.tsx", import.meta.url),
    "utf8",
  );
  const messageListSource = await readFile(
    new URL("../messages/message-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(sidebarSource, /ChildRunInspector/);
  assert.match(sidebarSource, /ChildRunList/);
  assert.match(inspectorSource, /Dialog/);
  assert.match(messageListSource, /DelegationSummary/);
});
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

```bash
pnpm --dir frontend test:contracts -- src/components/workspace/child-runs/child-run-inspector.contract.test.ts
```

Expected:

- FAIL because child-run list/inspector/summary components do not exist

- [ ] **Step 3: Implement sidebar child-run list, inspector, and main-thread summary**

```tsx
// frontend/src/components/workspace/child-runs/child-run-list.tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { ChildRunRecord } from "@/core/child-runs/types";

export function ChildRunList({
  childRuns,
  onSelect,
}: {
  childRuns: ChildRunRecord[];
  onSelect: (childRun: ChildRunRecord) => void;
}) {
  if (childRuns.length === 0) return null;
  return (
    <Collapsible defaultOpen className="mt-2">
      <CollapsibleTrigger className="text-muted-foreground text-xs">
        子智能体会话 ({childRuns.length})
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 flex flex-col gap-1">
        {childRuns.map((childRun) => (
          <button
            key={childRun.child_run_id}
            type="button"
            className="rounded-lg border px-2 py-2 text-left text-xs"
            onClick={() => onSelect(childRun)}
          >
            <div className="font-medium">{childRun.title}</div>
            <div className="text-muted-foreground">{childRun.status}</div>
          </button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
```

```tsx
// frontend/src/components/workspace/child-runs/child-run-inspector.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChildRunRecord } from "@/core/child-runs/types";

export function ChildRunInspector({
  open,
  childRun,
  onOpenChange,
}: {
  open: boolean;
  childRun: ChildRunRecord | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{childRun?.title ?? "子智能体会话"}</DialogTitle>
        </DialogHeader>
        <pre className="max-h-[60vh] overflow-auto rounded-lg border p-4 text-xs">
          {JSON.stringify(childRun, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
```

```tsx
// frontend/src/components/workspace/messages/delegation-summary.tsx
export function DelegationSummary({ count }: { count: number }) {
  return (
    <div className="text-muted-foreground rounded-lg border px-3 py-2 text-sm">
      已调度 {count} 个子智能体。详细过程请在左侧会话列表中展开查看。
    </div>
  );
}
```

```tsx
// frontend/src/components/workspace/recent-chat-list.tsx
const childRuns = Object.values(thread.values.child_runs ?? {}).filter(
  (item) => item.status !== "closed",
);

...

{isActive ? (
  <ChildRunList
    childRuns={childRuns}
    onSelect={(childRun) => {
      setSelectedChildRun(childRun);
      setChildRunInspectorOpen(true);
    }}
  />
) : null}
```

```tsx
// frontend/src/components/workspace/messages/message-list.tsx
if (group.type === "assistant:subagent") {
  return <DelegationSummary key={group.id} count={getTaskToolCallIds(group.messages[0]?.tool_calls)?.length ?? 0} />;
}
```

- [ ] **Step 4: Run the UI contract test and the existing recent chat contract**

Run:

```bash
pnpm --dir frontend test:contracts -- src/components/workspace/child-runs/child-run-inspector.contract.test.ts
pnpm --dir frontend test:contracts -- src/components/workspace/recent-chat-list.contract.test.ts
pnpm --dir frontend typecheck
```

Expected:

- New child-run inspector contract PASS
- Existing recent chat list contract still PASS
- Typecheck PASS

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/child-runs/child-run-list.tsx \
  frontend/src/components/workspace/child-runs/child-run-inspector.tsx \
  frontend/src/components/workspace/messages/delegation-summary.tsx \
  frontend/src/components/workspace/recent-chat-list.tsx \
  frontend/src/components/workspace/messages/message-list.tsx \
  frontend/src/core/messages/utils.ts \
  frontend/src/components/workspace/child-runs/child-run-inspector.contract.test.ts
git commit -F - <<'EOF'
Render delegated child runs as sidebar-inspectable temporary sessions

Move delegated execution detail out of the main message flow and into a
sidebar-driven inspector so the main thread remains the only formal
conversation while child runs stay visible and temporary.

Constraint: The main chat remains single-speaker; child runs are inspectable but not first-class chats
Rejected: Keep full child-run transcripts in the main message list | too noisy and breaks the UX boundary
Confidence: medium
Scope-risk: moderate
Reversibility: clean
Directive: Treat message-list subagent output as summary-only once the sidebar inspector exists
Tested: pnpm --dir frontend test:contracts -- src/components/workspace/child-runs/child-run-inspector.contract.test.ts; pnpm --dir frontend test:contracts -- src/components/workspace/recent-chat-list.contract.test.ts; pnpm --dir frontend typecheck
Not-tested: Full end-to-end SSE flow
EOF
```

## Task 8: Add Remote Transport Seam (ACP First, A2A Discovery-Ready)

**Files:**
- Create: `backend/packages/harness/nion/orchestration/remote_agent_transport.py`
- Create: `backend/packages/harness/nion/orchestration/remote_transports/__init__.py`
- Create: `backend/packages/harness/nion/orchestration/remote_transports/acp.py`
- Create: `backend/packages/harness/nion/orchestration/remote_transports/a2a.py`
- Modify: `backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`
- Test: `backend/tests/test_remote_agent_transport.py`

- [ ] **Step 1: Write the failing transport tests**

```python
# backend/tests/test_remote_agent_transport.py
from nion.orchestration.remote_agent_transport import RemoteAgentTarget, resolve_remote_transport


def test_resolve_remote_transport_prefers_local_for_catalog_agents():
    target = RemoteAgentTarget(kind="local", agent_name="research-agent")
    transport = resolve_remote_transport(target)
    assert transport.kind == "local"


def test_a2a_transport_can_build_agent_card_url():
    from nion.orchestration.remote_transports.a2a import build_agent_card_url

    assert build_agent_card_url("https://agents.example.com/worker") == "https://agents.example.com/worker/.well-known/agent-card.json"
```

- [ ] **Step 2: Run the transport tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_remote_agent_transport.py -q
```

Expected:

- FAIL because remote transport seam does not exist

- [ ] **Step 3: Implement the transport protocol, ACP adapter, and A2A discovery helper**

```python
# backend/packages/harness/nion/orchestration/remote_agent_transport.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

TransportKind = Literal["local", "acp", "a2a"]


@dataclass(slots=True)
class RemoteAgentTarget:
    kind: TransportKind
    agent_name: str
    base_url: str | None = None


class RemoteAgentTransport(Protocol):
    kind: TransportKind


@dataclass(slots=True)
class LocalTransport:
    kind: TransportKind = "local"


def resolve_remote_transport(target: RemoteAgentTarget) -> RemoteAgentTransport:
    if target.kind == "local":
        return LocalTransport()
    if target.kind == "acp":
        from nion.orchestration.remote_transports.acp import ACPTransport
        return ACPTransport(agent_name=target.agent_name)
    from nion.orchestration.remote_transports.a2a import A2ADiscoveryTransport
    return A2ADiscoveryTransport(base_url=target.base_url or "")
```

```python
# backend/packages/harness/nion/orchestration/remote_transports/a2a.py
from __future__ import annotations


def build_agent_card_url(base_url: str) -> str:
    return base_url.rstrip("/") + "/.well-known/agent-card.json"


class A2ADiscoveryTransport:
    kind = "a2a"

    def __init__(self, *, base_url: str) -> None:
        self.base_url = base_url
```

```python
# backend/packages/harness/nion/orchestration/remote_transports/acp.py
from __future__ import annotations


class ACPTransport:
    kind = "acp"

    def __init__(self, *, agent_name: str) -> None:
        self.agent_name = agent_name
```

- [ ] **Step 4: Run the transport tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_remote_agent_transport.py -q
```

Expected:

- PASS with `2 passed`

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/orchestration/remote_agent_transport.py \
  backend/packages/harness/nion/orchestration/remote_transports/__init__.py \
  backend/packages/harness/nion/orchestration/remote_transports/acp.py \
  backend/packages/harness/nion/orchestration/remote_transports/a2a.py \
  backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py \
  backend/tests/test_remote_agent_transport.py
git commit -F - <<'EOF'
Add a remote transport seam without making protocols the local default

Introduce an explicit transport boundary so local catalog agents remain
in-process while ACP and A2A are available for remote coordination
without contaminating local orchestration semantics.

Constraint: Same-runtime custom agents must stay on the local LangGraph path
Rejected: Make A2A the default local delegation mechanism | wrong boundary and too heavy for in-process agents
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Treat A2A as remote discovery/execution infrastructure, not as a replacement for local orchestrator graphs
Tested: backend/.venv/bin/python -m pytest backend/tests/test_remote_agent_transport.py -q
Not-tested: Real ACP/A2A network integration
EOF
```

## Task 9: Update Docs And Run The Full Verification Matrix

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `frontend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Update the docs to describe the new boundaries**

Add these facts to the docs:

```md
- Main chat has a single formal speaker: the main agent.
- Delegated custom agents run as temporary child runs.
- Child runs are inspectable from the sidebar but are not archived as formal threads.
- Local custom-agent coordination uses LangGraph orchestration.
- ACP/A2A are remote transport seams, not the default local orchestration path.
```

- [ ] **Step 2: Run the backend verification batch**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_ephemeral_child_run_repository.py \
  backend/tests/test_thread_child_run_router.py \
  backend/tests/test_delegation_policy.py \
  backend/tests/test_mention_parser.py \
  backend/tests/test_orchestrator_graph.py \
  backend/tests/test_thread_service_delegation_stream.py \
  backend/tests/test_remote_agent_transport.py -q
```

Expected:

- PASS

- [ ] **Step 3: Run the frontend verification batch**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/components/workspace/recent-chat-list.contract.test.ts \
  src/components/workspace/recent-chat-list.child-runs.contract.test.ts \
  src/components/workspace/child-runs/child-run-inspector.contract.test.ts
pnpm --dir frontend typecheck
pnpm --dir frontend lint
```

Expected:

- All contract tests PASS
- `tsc --noEmit` PASS
- ESLint PASS

- [ ] **Step 4: Do one manual smoke pass**

Manual checklist:

```text
1. Create three custom agents
2. Ask the main chat to run a chained @agent task
3. Confirm only the main agent speaks in the main thread
4. Confirm the active thread row can expand child runs
5. Open one child run and inspect its temporary transcript
6. Finish the task and confirm child runs auto-close
7. Refresh and confirm child runs do not appear as first-class recent chats
```

- [ ] **Step 5: Commit**

```bash
git add \
  README.md \
  backend/README.md \
  backend/CLAUDE.md \
  frontend/CLAUDE.md \
  docs/test/README.md
git commit -F - <<'EOF'
Document governed custom-agent orchestration and verification paths

Update repo documentation so the new main-agent, child-run, and
remote-transport boundaries are explicit to future implementers and
reviewers.

Constraint: Repository docs must stay in sync with runtime behavior after every code change
Rejected: Leave the behavior discoverable only from code | too easy to drift and mis-implement
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep docs aligned with the single-speaker main thread rule and the temporary child-run lifecycle
Tested: backend and frontend verification batches plus the manual smoke checklist
Not-tested: Cross-runtime A2A interoperability against a real remote agent
EOF
```

## Self-Review

### Spec coverage

- PRD 中关于主智能体唯一对外发声、custom agent 可独立/可调度、child runs 可检查但不归档、LangGraph 优先与 A2A/ACP transport seam 的要求，都在 Task 1-9 中有对应落点。
- Test Spec 中的 backend contract、child-run API、LangGraph glue、frontend sidebar/inspector、remote transport seam，都有对应任务。

### Placeholder scan

- 本计划正文未使用待补充占位符或“引用前文自行类推”式写法。
- 每个代码步骤都给了实际文件路径和最小实现代码块。

### Type consistency

- `ChildRunRecord` / `ChildRunStatus` / `DelegatedExecutionProfile` / `MentionedAgentStep` 在任务顺序里先定义，后使用。
- frontend `child_runs` 状态与 backend `child_run_*` 事件命名保持一致。
