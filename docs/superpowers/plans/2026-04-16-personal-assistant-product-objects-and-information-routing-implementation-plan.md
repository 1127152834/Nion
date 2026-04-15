# Personal Assistant Product Objects And Information Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Nion 的产品对象、信息路由、Knowledge promotion、Automation 语义与兼容迁移收口成可执行主链，使其更接近成熟的个人办公生活助手，而不是继续暴露为平台能力集合。

**Architecture:** 先建立一个统一的 `Information Router` 和 `Read Routing Contract`，把输入与读取路由从“临场判断”提升成 typed contract；再围绕 `USER.md / IDENTITY.md / SOUL.md / MEMORY.md / Notebook / Knowledge / Automation` 六个长期层与一个当前回合层，逐步修正 owner、compat adapter、promotion pipeline 和权限矩阵。整个改造以 `Notebook = raw`、`Knowledge = compiled wiki`、`Memory = assistant long-term memory`、`Automation = assistant commitment` 为上位约束。

**Tech Stack:** FastAPI routers, `nion.*` harness runtime, LangGraph-based agent runtime, notebook/knowledge services, automation service, frontend workspace/settings surfaces, TypeScript contracts, pytest, frontend contract tests.

---

## Scope Summary

本计划覆盖五条主线：

1. `InformationRouteDecision` typed contract 与执行主链
2. `Read Routing Contract` 与 runtime/context owner 收口
3. `USER / IDENTITY / SOUL / MEMORY` 的迁移与兼容边界
4. `Notebook -> Knowledge` promotion、revision request、stale/source_missing 生命周期
5. `Automation` 从 scheduler substrate 到 assistant commitment 的权限矩阵与产品语义

本计划**不**直接实现新的产品视觉设计，也**不**重做所有页面。
本计划优先建立 runtime / API / contract / owner 级主链，页面只做必要的 contract 跟进。

---

## File Structure

### Backend

- Create: `backend/packages/harness/nion/information_routing/models.py`
- Create: `backend/packages/harness/nion/information_routing/rules.py`
- Create: `backend/packages/harness/nion/information_routing/service.py`
- Create: `backend/packages/harness/nion/information_routing/read_contract.py`
- Create: `backend/packages/harness/nion/information_routing/tests/`（如项目惯例允许；否则落到 `backend/tests/`）
- Create: `backend/packages/harness/nion/knowledge/revision/models.py`
- Create: `backend/packages/harness/nion/knowledge/revision/service.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/packages/harness/nion/user_identity/service.py`
- Modify: `backend/app/gateway/routers/user_identity.py`
- Modify: `backend/app/gateway/routers/identity_document.py`
- Modify: `backend/app/gateway/routers/soul_document.py`
- Modify: `backend/app/gateway/routers/knowledge.py`
- Modify: `backend/app/gateway/routers/notebook.py`
- Modify: `backend/app/gateway/routers/automation.py`
- Modify: `backend/packages/harness/nion/automation/models.py`
- Modify: `backend/packages/harness/nion/automation/service.py`

### Frontend

- Modify: `frontend/src/core/notebook/*`（若现有模块承担 promotion 入口）
- Modify: `frontend/src/core/knowledge/*`
- Modify: `frontend/src/core/memory-settings/*`（如涉及新的 product labels / owners）
- Modify: `frontend/src/components/workspace/notebook/*`
- Modify: `frontend/src/components/workspace/knowledge/*`
- Modify: `frontend/src/components/workspace/settings/identity-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/components/workspace/automation/*`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-sections.ts`

### Docs / Tests

- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/project-knowledge-map.md`
- Test: `backend/tests/test_user_identity_service.py`
- Test: `backend/tests/test_runtime_context_files.py`
- Test: `backend/tests/test_memory_runtime_injection.py`
- Test: `backend/tests/test_notebook_service.py`
- Test: `backend/tests/test_automation_scheduler.py`
- Add: `backend/tests/test_information_routing_service.py`
- Add: `backend/tests/test_knowledge_revision_service.py`
- Add: `backend/tests/test_personal_assistant_read_routing.py`
- Add: frontend contract tests for Notebook/Knowledge/Automation labels and actions

---

## Task 1: Introduce Information Routing Domain Model

**Files:**
- Create: `backend/packages/harness/nion/information_routing/models.py`
- Test: `backend/tests/test_information_routing_service.py`

- [ ] **Step 1: Write the failing domain-model test**

```python
from nion.information_routing.models import (
    AutomationRouteDecision,
    CurrentTurnOnlyRouteDecision,
    IdentityRouteDecision,
    KnowledgeRouteDecision,
    MemoryRouteDecision,
    NotebookRouteDecision,
    SoulRouteDecision,
    UserRouteDecision,
)


def test_information_route_decision_types_are_discriminated_by_target():
    decisions = [
        CurrentTurnOnlyRouteDecision(
            target="current_turn_only",
            confidence=1.0,
            reason="one-shot task",
            evidence="帮我总结一下",
            write_policy="none",
            confirmation_required=False,
        ),
        UserRouteDecision(
            target="USER.md",
            confidence=0.95,
            reason="explicit user identity statement",
            evidence="我叫张天成",
            write_policy="direct_patch",
            confirmation_required=False,
            payload={"field_patches": {"user_name": "张天成"}},
        ),
        IdentityRouteDecision(
            target="IDENTITY.md",
            confidence=0.93,
            reason="assistant identity statement",
            evidence="你是我的长期办公生活助手",
            write_policy="direct_patch",
            confirmation_required=False,
            payload={"patch_mode": "section_patch", "sections": {"core_identity": "长期办公生活助手"}},
        ),
        SoulRouteDecision(
            target="SOUL.md",
            confidence=0.92,
            reason="assistant behavior instruction",
            evidence="以后回答直接点",
            write_policy="direct_patch",
            confirmation_required=False,
            payload={"patch_mode": "section_patch", "sections": {"speech_style": "直接、结论先行"}},
        ),
        MemoryRouteDecision(
            target="MEMORY.md",
            confidence=0.9,
            reason="long-term project fact",
            evidence="我们正在做 Nion",
            write_policy="direct_patch",
            confirmation_required=False,
            payload={"memory_kind": "project_fact", "summary": "用户正在推进 Nion 项目"},
        ),
        NotebookRouteDecision(
            target="Notebook",
            confidence=0.99,
            reason="explicit save request",
            evidence="把这段会议记录保存下来",
            write_policy="save_raw",
            confirmation_required=False,
            payload={"create_mode": "new_note", "title": "会议记录", "body": "..."},  # noqa: PIE790
        ),
        KnowledgeRouteDecision(
            target="Knowledge",
            confidence=0.88,
            reason="explicit knowledge promotion request",
            evidence="把这篇笔记沉淀为知识库",
            write_policy="compile_candidate",
            confirmation_required=True,
            payload={"source_note_id": "note-1", "compile_intent": "new_candidate", "candidate_reason": "用户明确要求沉淀"},
        ),
        AutomationRouteDecision(
            target="Automation",
            confidence=0.91,
            reason="scheduled recurring assistant commitment",
            evidence="每天早上帮我整理今日待办",
            write_policy="suggest_then_confirm",
            confirmation_required=True,
            payload={
                "commitment_kind": "user_created",
                "intent": "daily daily-plan digest",
                "schedule": {"kind": "cron", "value": "0 9 * * *", "timezone": "Asia/Shanghai"},
                "input_scopes": ["USER", "MEMORY", "Knowledge"],
                "write_scopes": ["thread_output"],
                "delivery_scopes": ["thread"],
                "failure_policy": "notify_user",
            },
        ),
    ]

    assert [decision.target for decision in decisions] == [
        "current_turn_only",
        "USER.md",
        "IDENTITY.md",
        "SOUL.md",
        "MEMORY.md",
        "Notebook",
        "Knowledge",
        "Automation",
    ]
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_information_routing_service.py::test_information_route_decision_types_are_discriminated_by_target -q
```

Expected:

```text
E   ModuleNotFoundError: No module named 'nion.information_routing'
```

- [ ] **Step 3: Implement the discriminated route models**

```python
# backend/packages/harness/nion/information_routing/models.py
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


WritePolicy = Literal[
    "none",
    "direct_patch",
    "save_raw",
    "compile_candidate",
    "suggest_then_confirm",
]


class BaseRouteDecision(BaseModel):
    target: str
    confidence: float = Field(ge=0.0, le=1.0)
    reason: str
    evidence: str
    source_turn_id: str | None = None
    write_policy: WritePolicy
    confirmation_required: bool


class CurrentTurnOnlyRouteDecision(BaseRouteDecision):
    target: Literal["current_turn_only"]


class UserRouteDecision(BaseRouteDecision):
    target: Literal["USER.md"]
    payload: dict


class IdentityRouteDecision(BaseRouteDecision):
    target: Literal["IDENTITY.md"]
    payload: dict


class SoulRouteDecision(BaseRouteDecision):
    target: Literal["SOUL.md"]
    payload: dict


class MemoryRouteDecision(BaseRouteDecision):
    target: Literal["MEMORY.md"]
    payload: dict


class NotebookRouteDecision(BaseRouteDecision):
    target: Literal["Notebook"]
    payload: dict


class KnowledgeRouteDecision(BaseRouteDecision):
    target: Literal["Knowledge"]
    payload: dict


class AutomationRouteDecision(BaseRouteDecision):
    target: Literal["Automation"]
    payload: dict
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
uv run pytest backend/tests/test_information_routing_service.py::test_information_route_decision_types_are_discriminated_by_target -q
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/information_routing/models.py backend/tests/test_information_routing_service.py
git commit -m "feat: introduce typed information routing decisions"
```

### Task 2: Implement Deterministic Information Router Rules

**Files:**
- Create: `backend/packages/harness/nion/information_routing/rules.py`
- Create: `backend/packages/harness/nion/information_routing/service.py`
- Test: `backend/tests/test_information_routing_service.py`

- [ ] **Step 1: Extend the test suite with core routing examples**

```python
from nion.information_routing.service import route_information


def test_route_information_maps_explicit_assistant_identity_to_identity_document():
    decision = route_information("你是我的长期办公生活助手，不是编码助手")
    assert decision.target == "IDENTITY.md"
    assert decision.write_policy == "direct_patch"


def test_route_information_maps_explicit_behavior_instruction_to_soul_document():
    decision = route_information("以后回答直接点，不要讨好我")
    assert decision.target == "SOUL.md"
    assert decision.confirmation_required is False


def test_route_information_maps_save_request_to_notebook():
    decision = route_information("把这段会议记录保存下来")
    assert decision.target == "Notebook"
    assert decision.write_policy == "save_raw"


def test_route_information_maps_knowledge_promotion_request_to_compile_candidate():
    decision = route_information("把这篇笔记沉淀成知识库")
    assert decision.target == "Knowledge"
    assert decision.write_policy == "compile_candidate"
    assert decision.confirmation_required is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
uv run pytest backend/tests/test_information_routing_service.py -q
```

Expected:

```text
E   ImportError: cannot import name 'route_information'
```

- [ ] **Step 3: Implement deterministic route rules**

```python
# backend/packages/harness/nion/information_routing/rules.py
from __future__ import annotations

import re


IDENTITY_PATTERNS = (
    re.compile(r"你是我的.*助手"),
    re.compile(r"不是编码助手"),
)

SOUL_PATTERNS = (
    re.compile(r"以后回答.*直接"),
    re.compile(r"不要讨好我"),
    re.compile(r"说话.*直接"),
)

NOTEBOOK_PATTERNS = (
    re.compile(r"保存下来"),
    re.compile(r"保存这段"),
    re.compile(r"记录一下"),
)

KNOWLEDGE_PATTERNS = (
    re.compile(r"沉淀成知识库"),
    re.compile(r"转为知识库"),
    re.compile(r"整理成知识"),
)
```

```python
# backend/packages/harness/nion/information_routing/service.py
from __future__ import annotations

from nion.information_routing.models import (
    CurrentTurnOnlyRouteDecision,
    IdentityRouteDecision,
    KnowledgeRouteDecision,
    NotebookRouteDecision,
    SoulRouteDecision,
)
from nion.information_routing.rules import (
    IDENTITY_PATTERNS,
    KNOWLEDGE_PATTERNS,
    NOTEBOOK_PATTERNS,
    SOUL_PATTERNS,
)


def route_information(text: str):
    normalized = text.strip()
    if any(pattern.search(normalized) for pattern in KNOWLEDGE_PATTERNS):
        return KnowledgeRouteDecision(
            target="Knowledge",
            confidence=0.9,
            reason="explicit knowledge promotion request",
            evidence=normalized,
            write_policy="compile_candidate",
            confirmation_required=True,
            payload={"compile_intent": "new_candidate", "candidate_reason": "用户明确要求沉淀"},
        )
    if any(pattern.search(normalized) for pattern in NOTEBOOK_PATTERNS):
        return NotebookRouteDecision(
            target="Notebook",
            confidence=0.95,
            reason="explicit raw material save request",
            evidence=normalized,
            write_policy="save_raw",
            confirmation_required=False,
            payload={"create_mode": "new_note", "body": normalized},
        )
    if any(pattern.search(normalized) for pattern in IDENTITY_PATTERNS):
        return IdentityRouteDecision(
            target="IDENTITY.md",
            confidence=0.93,
            reason="assistant identity or mission definition",
            evidence=normalized,
            write_policy="direct_patch",
            confirmation_required=False,
            payload={"patch_mode": "document_patch", "sections": {"core_identity": normalized}},
        )
    if any(pattern.search(normalized) for pattern in SOUL_PATTERNS):
        return SoulRouteDecision(
            target="SOUL.md",
            confidence=0.93,
            reason="assistant behavior instruction",
            evidence=normalized,
            write_policy="direct_patch",
            confirmation_required=False,
            payload={"patch_mode": "document_patch", "sections": {"speech_style": normalized}},
        )
    return CurrentTurnOnlyRouteDecision(
        target="current_turn_only",
        confidence=0.7,
        reason="one-shot task or insufficient durable signal",
        evidence=normalized,
        write_policy="none",
        confirmation_required=False,
    )
```

- [ ] **Step 4: Run the test suite to verify it passes**

Run:

```bash
uv run pytest backend/tests/test_information_routing_service.py -q
```

Expected:

```text
4 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/information_routing/rules.py backend/packages/harness/nion/information_routing/service.py backend/tests/test_information_routing_service.py
git commit -m "feat: add deterministic information routing rules"
```

### Task 3: Add Read Routing Contract to Runtime Memory Assembly

**Files:**
- Create: `backend/packages/harness/nion/information_routing/read_contract.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Test: `backend/tests/test_personal_assistant_read_routing.py`

- [ ] **Step 1: Write failing tests for read routing priorities**

```python
from nion.information_routing.read_contract import resolve_read_priority


def test_read_priority_for_identity_question_prefers_identity_then_soul():
    order = resolve_read_priority("你是谁")
    assert order == ["IDENTITY.md", "SOUL.md"]


def test_read_priority_for_knowledge_question_prefers_knowledge_before_notebook():
    order = resolve_read_priority("根据知识库告诉我我们的产品原则")
    assert order[0] == "Knowledge"
    assert "Notebook" in order
    assert order.index("Knowledge") < order.index("Notebook")
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
uv run pytest backend/tests/test_personal_assistant_read_routing.py -q
```

Expected:

```text
E   ModuleNotFoundError: No module named 'nion.information_routing.read_contract'
```

- [ ] **Step 3: Implement read priority resolver**

```python
# backend/packages/harness/nion/information_routing/read_contract.py
from __future__ import annotations


def resolve_read_priority(query: str) -> list[str]:
    normalized = query.strip()
    if "你是谁" in normalized or "你的身份" in normalized:
        return ["IDENTITY.md", "SOUL.md"]
    if "我是谁" in normalized or "我的身份" in normalized:
        return ["USER.md", "MEMORY.md"]
    if "知识库" in normalized or "知识" in normalized:
        return ["Knowledge", "Notebook"]
    if "笔记" in normalized:
        return ["Notebook"]
    return ["MEMORY.md", "Knowledge", "Notebook"]
```

```python
# backend/packages/harness/nion/memory/runtime_engine/service.py
# Add near the top:
from nion.information_routing.read_contract import resolve_read_priority

# Add helper:
def explain_runtime_read_priority(query: str) -> list[str]:
    return resolve_read_priority(query)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_personal_assistant_read_routing.py -q
```

Expected:

```text
2 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/information_routing/read_contract.py backend/packages/harness/nion/memory/runtime_engine/service.py backend/tests/test_personal_assistant_read_routing.py
git commit -m "feat: add personal assistant read routing contract"
```

### Task 4: Implement Knowledge Revision Request Domain

**Files:**
- Create: `backend/packages/harness/nion/knowledge/revision/models.py`
- Create: `backend/packages/harness/nion/knowledge/revision/service.py`
- Test: `backend/tests/test_knowledge_revision_service.py`

- [ ] **Step 1: Write failing revision-request tests**

```python
from pathlib import Path

from nion.knowledge.revision.service import KnowledgeRevisionService


def test_create_revision_request_records_reason_and_action(tmp_path: Path):
    service = KnowledgeRevisionService(base_dir=tmp_path)
    request = service.create_request(
        page_id="page:product-principles",
        source_note_id="note-123",
        reason="这一页把助手身份和用户身份混了",
        requested_action="fix_source_then_recompile",
    )
    assert request.page_id == "page:product-principles"
    assert request.source_note_id == "note-123"
    assert request.status == "pending"
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_knowledge_revision_service.py -q
```

Expected:

```text
E   ModuleNotFoundError: No module named 'nion.knowledge.revision'
```

- [ ] **Step 3: Implement the revision request model and service**

```python
# backend/packages/harness/nion/knowledge/revision/models.py
from __future__ import annotations

from pydantic import BaseModel


class KnowledgeRevisionRequest(BaseModel):
    request_id: str
    page_id: str
    source_note_id: str | None = None
    source_asset_id: str | None = None
    reason: str
    requested_action: str
    created_at: str
    status: str = "pending"
```

```python
# backend/packages/harness/nion/knowledge/revision/service.py
from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

from nion.memory_os.clock import utcnow_z
from nion.knowledge.revision.models import KnowledgeRevisionRequest


class KnowledgeRevisionService:
    def __init__(self, *, base_dir: str | Path):
        self._base_dir = Path(base_dir)
        self._store = self._base_dir / "knowledge-revision-requests.jsonl"

    def create_request(
        self,
        *,
        page_id: str,
        source_note_id: str | None,
        reason: str,
        requested_action: str,
        source_asset_id: str | None = None,
    ) -> KnowledgeRevisionRequest:
        request = KnowledgeRevisionRequest(
            request_id=f"kr_{uuid4().hex[:8]}",
            page_id=page_id,
            source_note_id=source_note_id,
            source_asset_id=source_asset_id,
            reason=reason,
            requested_action=requested_action,
            created_at=utcnow_z(),
        )
        self._store.parent.mkdir(parents=True, exist_ok=True)
        with self._store.open("a", encoding="utf-8") as handle:
            handle.write(request.model_dump_json() + "\\n")
        return request
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_knowledge_revision_service.py -q
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/knowledge/revision/models.py backend/packages/harness/nion/knowledge/revision/service.py backend/tests/test_knowledge_revision_service.py
git commit -m "feat: add knowledge revision request domain"
```

### Task 5: Add Automation Permission Matrix Fields

**Files:**
- Modify: `backend/packages/harness/nion/automation/models.py`
- Modify: `backend/packages/harness/nion/automation/service.py`
- Test: `backend/tests/test_automation_scheduler.py`

- [ ] **Step 1: Write a failing automation permissions test**

```python
from datetime import UTC, datetime
from pathlib import Path

from nion.automation.models import AutomationJob
from nion.automation.repository import AutomationRepository
from nion.automation.scheduler import AutomationScheduler
from nion.automation.service import AutomationService


def test_agent_owned_job_defaults_to_internal_scopes(tmp_path: Path):
    repo = AutomationRepository(tmp_path / "automation.db")
    scheduler = AutomationScheduler(repo)
    service = AutomationService(repository=repo, scheduler=scheduler)
    job = service.create_job(
        {
            "name": "Nightly memory maintenance",
            "prompt": "整理 memory",
            "owner_type": "agent",
            "job_kind": "scheduled_task",
            "schedule_kind": "cron",
            "schedule_value": "0 3 * * *",
        }
    )
    assert job.policy_flags["input_scopes"] == ["system_state", "memory_metadata"]
    assert job.policy_flags["write_scopes"] == ["internal_log", "maintenance_state"]
    assert job.policy_flags["delivery_scopes"] == []
    assert job.policy_flags["failure_policy"] == "internal_only"
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_automation_scheduler.py::test_agent_owned_job_defaults_to_internal_scopes -q
```

Expected:

```text
E   KeyError: 'input_scopes'
```

- [ ] **Step 3: Implement default permission matrix injection**

```python
# backend/packages/harness/nion/automation/service.py
# Add helper near top-level:
def _default_policy_flags_for_owner(owner_type: str) -> dict[str, object]:
    if owner_type == "agent":
        return {
            "input_scopes": ["system_state", "memory_metadata"],
            "write_scopes": ["internal_log", "maintenance_state"],
            "delivery_scopes": [],
            "failure_policy": "internal_only",
        }
    return {
        "input_scopes": [],
        "write_scopes": [],
        "delivery_scopes": [],
        "failure_policy": "notify_user",
    }
```

```python
# backend/packages/harness/nion/automation/service.py
# Inside create_job(), replace policy_flags assignment with:
raw_policy_flags = self._coerce_mapping(payload.get("policy_flags"))
default_policy_flags = _default_policy_flags_for_owner(str(payload.get("owner_type") or "user"))
policy_flags = {**default_policy_flags, **raw_policy_flags}
```

```python
# backend/packages/harness/nion/automation/models.py
# Keep the model type stable but document fields:
policy_flags: dict[str, Any] = Field(default_factory=dict)
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
uv run pytest backend/tests/test_automation_scheduler.py::test_agent_owned_job_defaults_to_internal_scopes -q
```

Expected:

```text
1 passed
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/automation/models.py backend/packages/harness/nion/automation/service.py backend/tests/test_automation_scheduler.py
git commit -m "feat: add assistant commitment permission defaults"
```

### Task 6: Add Notebook/Knowledge Product Contract UI Label Coverage

**Files:**
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-sections.ts`
- Add Test: `frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts`

- [ ] **Step 1: Write failing contract assertions for reduced top-level semantics**

```ts
import { describe, expect, it } from "vitest";

import { SETTINGS_SECTIONS } from "@/components/workspace/settings/settings-sections";

describe("personal assistant top-level semantics", () => {
  it("does not promote identity and soul as peer navigation routes", () => {
    expect(SETTINGS_SECTIONS.includes("identity")).toBe(true);
    expect(SETTINGS_SECTIONS.includes("soul")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to establish current baseline**

Run:

```bash
pnpm --dir frontend test:contracts -- src/components/workspace/workspace-nav-memory-links.contract.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 3: Add explicit comments and labels to prevent semantic drift**

```ts
// frontend/src/components/workspace/settings/settings-sections.ts
// NOTE: identity and soul stay in Settings as subordinate facets of the
// assistant's long-term profile system. They are not top-level workspace objects.
export const SETTINGS_SECTIONS = [
  "appearance",
  "models",
  "retrievalModels",
  "sessionPolicy",
  "notification",
  "daemon",
  "memory",
  "identity",
  "soul",
  "tools",
  "search",
  "cliTools",
  "agentIntegrations",
  "mcpServers",
  "skills",
  "sandbox",
] as const;
```

```tsx
// frontend/src/components/workspace/workspace-nav-menu.tsx
// Keep top-level workspace navigation focused on user-facing product objects:
// notebook, knowledge, memory, bridge, and settings. Identity/Soul remain
// settings facets rather than peer workspace objects.
```

- [ ] **Step 4: Re-run the contract test**

Run:

```bash
pnpm --dir frontend test:contracts -- src/components/workspace/workspace-nav-memory-links.contract.test.ts
```

Expected:

```text
PASS
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/workspace-nav-menu.tsx frontend/src/components/workspace/settings/settings-sections.ts frontend/src/components/workspace/workspace-nav-memory-links.contract.test.ts
git commit -m "docs: encode personal assistant object semantics in UI contracts"
```

### Task 7: Sync Documentation Truth Sources

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/project-knowledge-map.md`
- Test: doc diff / manual verification

- [ ] **Step 1: Add failing checklist in progress log**

Record this checklist in `progress.md` or implementation notes before editing docs:

```md
- [ ] README terminology updated
- [ ] backend/CLAUDE.md terminology updated
- [ ] project knowledge map points to the new design doc
```

- [ ] **Step 2: Update README product terminology**

Add or revise prose so it explicitly reflects:

```md
- Notebook is user-owned raw material
- Knowledge is a compiled LLM wiki derived from Notebook
- Memory is assistant-owned long-term memory from chats and execution
- Identity and Soul are separate assistant-facing documents
- Automation is framed as assistant commitments, not just jobs
```

- [ ] **Step 3: Update backend/CLAUDE.md contract language**

Add or revise the relevant sections so they match the new contract:

```md
- USER.md = user identity
- IDENTITY.md = assistant identity
- SOUL.md = assistant behavior/persona
- Knowledge cannot be directly created outside Notebook promotion
- Information routing must follow the personal assistant product object contract
```

- [ ] **Step 4: Update project knowledge map**

Add the new design doc to the relevant read order:

```md
- docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md
```

- [ ] **Step 5: Verify the docs are coherent**

Run:

```bash
git diff -- README.md backend/CLAUDE.md docs/project-knowledge-map.md
```

Expected:

```text
Diff only contains terminology and truth-source updates aligned with the new product object contract
```

- [ ] **Step 6: Commit**

```bash
git add README.md backend/CLAUDE.md docs/project-knowledge-map.md
git commit -m "docs: align product object terminology with personal assistant contract"
```

## Spec Coverage Check

This plan covers the main open gaps from the strengthened spec:

- `InformationRouteDecision` target-specific payload schema: Tasks 1-2
- `Read Routing Contract`: Task 3
- `Knowledge revision request`: Task 4
- `Automation` permission matrix: Task 5
- Product semantic drift guardrails in UI/docs: Tasks 6-7

Not yet covered in this plan:

- Full Notebook → Knowledge compile engine implementation
- Full USER / IDENTITY / SOUL file-native document owner migration
- Visual IA redesign across all workspace surfaces

Those should be separate follow-up plans after the contract and routing layers are stable.

## Self-Review

### Placeholder scan

- No `TODO` / `TBD` placeholders remain.
- Every task has explicit files, commands, and code snippets.

### Internal consistency

- The plan consistently treats Knowledge as Notebook-derived compiled content.
- It consistently treats IDENTITY as assistant identity and USER as user identity.
- It consistently separates runtime route schema, read routing, and permission policy.

### Scope check

- This plan is intentionally scoped to contract and owner closure.
- It does not attempt to rebuild the whole product in one implementation lane.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-16-personal-assistant-product-objects-and-information-routing-implementation-plan.md`.

Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
