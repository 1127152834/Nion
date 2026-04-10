# User Identity Memory Layer And Soul Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Nion 补出稳定的用户身份记忆层，让名字、双向称谓、长期沟通偏好跨线程稳定生效，并把 Soul 调整为聊天优先、设置页即时生效的轻调教交互。

**Architecture:** 这轮实现分成五个批次。先建立 `UserIdentityProfile` 的正式 owner 和 API 合同，再补名字/称谓/沟通偏好的确定性提取；之后把 runtime 改成 always-on identity + soul baseline；最后重做前端的 `Settings > Soul` 交互并升级行为验收题库。Task 2、Task 3、Task 4 在 Task 1 完成后可以并行推进。

**Tech Stack:** Python, FastAPI, SQLite, LangChain/LangGraph middleware, React, TypeScript, node:test, pytest, agent-browser dogfood

---

## File Map

### Backend foundation

- Create: `backend/packages/harness/nion/user_identity/__init__.py`
- Create: `backend/packages/harness/nion/user_identity/models.py`
- Create: `backend/packages/harness/nion/user_identity/repository.py`
- Create: `backend/packages/harness/nion/user_identity/service.py`
- Create: `backend/packages/harness/nion/user_identity/runtime.py`
- Create: `backend/app/gateway/routers/user_identity.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Modify: `backend/app/runtime/app_factory.py`

### Extraction and post-turn mutation

- Modify: `backend/packages/harness/nion/memory/extraction/models.py`
- Modify: `backend/packages/harness/nion/memory/extraction/service.py`
- Modify: `backend/packages/harness/nion/memory_os/extractor.py`
- Create: `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`

### Runtime injection

- Modify: `backend/packages/harness/nion/memory/runtime_engine/models.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/packages/harness/nion/memory_os/context_assembler.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`

### Soul and frontend interaction

- Modify: `backend/app/gateway/routers/user_identity.py`
- Modify: `backend/app/gateway/routers/memory_soul.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`
- Create: `frontend/src/core/user-identity/types.ts`
- Create: `frontend/src/core/user-identity/api.ts`
- Create: `frontend/src/core/user-identity/hooks.ts`
- Create: `frontend/src/components/workspace/settings/user-identity-panel.tsx`
- Create: `frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`
- Modify: `frontend/src/core/soul-settings/types.ts`
- Modify: `frontend/src/core/soul-settings/api.ts`
- Modify: `frontend/src/core/soul-settings/hooks.ts`
- Modify: `backend/tests/test_user_identity_router.py`

### Tests and verification

- Create: `backend/tests/test_user_identity_repository.py`
- Create: `backend/tests/test_user_identity_service.py`
- Create: `backend/tests/test_user_identity_router.py`
- Create: `backend/tests/test_user_identity_middleware.py`
- Modify: `backend/tests/test_memory_extraction_service.py`
- Modify: `backend/tests/test_memory_os_extractor.py`
- Modify: `backend/tests/test_runtime_memory_engine.py`
- Modify: `backend/tests/test_memory_runtime_soul_bundle.py`
- Modify: `backend/tests/test_memory_soul_router.py`
- Modify: `docs/test/10-memory-soul/behavioral-acceptance-questions.md`

## Task 1: Establish `UserIdentityProfile` As The Stable Owner

**Files:**
- Create: `backend/packages/harness/nion/user_identity/models.py`
- Create: `backend/packages/harness/nion/user_identity/repository.py`
- Create: `backend/packages/harness/nion/user_identity/service.py`
- Create: `backend/app/gateway/routers/user_identity.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Modify: `backend/app/runtime/app_factory.py`
- Create: `backend/tests/test_user_identity_repository.py`
- Create: `backend/tests/test_user_identity_service.py`
- Create: `backend/tests/test_user_identity_router.py`

- [ ] **Step 1: Write the failing repository and router tests**

```python
# backend/tests/test_user_identity_repository.py
from nion.user_identity.models import UserIdentityProfile
from nion.user_identity.repository import UserIdentityRepository


def test_user_identity_repository_round_trips_profile(tmp_path):
    repo = UserIdentityRepository(base_dir=tmp_path)
    profile = UserIdentityProfile(
        user_name="张天成",
        preferred_address_for_user="大哥",
        assistant_self_name="小老弟",
        mutual_addressing_rule="你叫我大哥，我叫你小老弟",
        communication_style_preferences=["结论先行", "少施压"],
        user_role="财务 BP",
        timezone="Asia/Shanghai",
    )

    repo.save(profile)
    loaded = repo.load()

    assert loaded.user_name == "张天成"
    assert loaded.preferred_address_for_user == "大哥"
    assert loaded.assistant_self_name == "小老弟"
    assert loaded.communication_style_preferences == ["结论先行", "少施压"]
```

```python
# backend/tests/test_user_identity_router.py
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_user_identity_router_exposes_empty_profile(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        response = client.get("/api/user-identity")

    assert response.status_code == 200
    assert response.json()["user_name"] == ""
    assert response.json()["preferred_address_for_user"] == ""
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_user_identity_repository.py \
  backend/tests/test_user_identity_service.py \
  backend/tests/test_user_identity_router.py -q
```

Expected:

- FAIL because `nion.user_identity` package and `/api/user-identity` route do not yet exist

- [ ] **Step 3: Implement the model, repository, and service**

```python
# backend/packages/harness/nion/user_identity/models.py
from pydantic import BaseModel, Field


class UserIdentityProfile(BaseModel):
    version: str = "1.0"
    user_name: str = ""
    user_aliases: list[str] = Field(default_factory=list)
    preferred_address_for_user: str = ""
    assistant_self_name: str = ""
    mutual_addressing_rule: str = ""
    communication_style_preferences: list[str] = Field(default_factory=list)
    user_role: str = ""
    timezone: str = ""
    interaction_boundaries: list[str] = Field(default_factory=list)
    long_term_background_summary: str = ""
    updated_at: str = ""
```

```python
# backend/packages/harness/nion/user_identity/repository.py
import json
from pathlib import Path

from nion.user_identity.models import UserIdentityProfile


class UserIdentityRepository:
    def __init__(self, base_dir: str | Path):
        self._base_dir = Path(base_dir)

    @property
    def _path(self) -> Path:
        return self._base_dir / "user_identity.json"

    def load(self) -> UserIdentityProfile:
        if not self._path.exists():
            return UserIdentityProfile()
        return UserIdentityProfile.model_validate(
            json.loads(self._path.read_text(encoding="utf-8"))
        )

    def save(self, profile: UserIdentityProfile) -> UserIdentityProfile:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(profile.model_dump_json(indent=2), encoding="utf-8")
        return profile
```

```python
# backend/packages/harness/nion/user_identity/service.py
from nion.memory_os.clock import utcnow_z
from nion.user_identity.models import UserIdentityProfile
from nion.user_identity.repository import UserIdentityRepository


class UserIdentityService:
    def __init__(self, repository: UserIdentityRepository):
        self._repository = repository

    def get_profile(self) -> UserIdentityProfile:
        return self._repository.load()

    def replace_profile(self, profile: UserIdentityProfile) -> UserIdentityProfile:
        return self._repository.save(
            profile.model_copy(update={"updated_at": utcnow_z()})
        )
```

- [ ] **Step 4: Add the router and register it**

```python
# backend/app/gateway/routers/user_identity.py
from fastapi import APIRouter

from nion.config.paths import get_paths
from nion.user_identity.repository import UserIdentityRepository
from nion.user_identity.service import UserIdentityService

router = APIRouter(prefix="/api/user-identity", tags=["memory"])


def _service() -> UserIdentityService:
    return UserIdentityService(UserIdentityRepository(get_paths().base_dir))


@router.get("")
async def get_user_identity():
    return _service().get_profile().model_dump(mode="json")
```

Update:

- `backend/app/gateway/routers/__init__.py`
- `backend/app/runtime/app_factory.py`

to include `user_identity.router`.

- [ ] **Step 5: Run the tests again**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_user_identity_repository.py \
  backend/tests/test_user_identity_service.py \
  backend/tests/test_user_identity_router.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit the foundation**

```bash
git add backend/packages/harness/nion/user_identity \
  backend/app/gateway/routers/user_identity.py \
  backend/app/gateway/routers/__init__.py \
  backend/app/runtime/app_factory.py \
  backend/tests/test_user_identity_repository.py \
  backend/tests/test_user_identity_service.py \
  backend/tests/test_user_identity_router.py
git commit -m "Introduce the stable user identity profile layer"
```

## Task 2: Extract Names, Addressing, And Communication Contracts

**Files:**
- Modify: `backend/packages/harness/nion/memory/extraction/models.py`
- Modify: `backend/packages/harness/nion/memory/extraction/service.py`
- Modify: `backend/packages/harness/nion/memory_os/extractor.py`
- Modify: `backend/tests/test_memory_extraction_service.py`
- Modify: `backend/tests/test_memory_os_extractor.py`

- [ ] **Step 1: Write failing tests for explicit name and mutual addressing extraction**

```python
def test_extract_memory_proposals_from_evidence_captures_user_name_and_mutual_addressing():
    proposals = extract_memory_proposals_from_evidence(
        evidence_documents=[
            _evidence_document(
                evidence_id="ev_identity",
                turn_id="turn-identity",
                content="我叫张天成，你以后叫我大哥，我叫你小老弟。",
            ),
        ]
    )

    kinds = {proposal.proposed_kind for proposal in proposals}
    assert "user_name" in kinds
    assert "mutual_addressing" in kinds
```

```python
def test_extractor_turns_name_and_addressing_signal_into_candidates():
    candidates = extract_candidates_from_exchange(
        messages=[HumanMessage(content="我叫张天成，你以后叫我大哥，我叫你小老弟。")],
        thread_id="thread-1",
    )

    subtypes = {candidate.proposed_subtype for candidate in candidates}
    assert "identity_name" in subtypes
    assert "mutual_addressing" in subtypes
```

- [ ] **Step 2: Run the extraction tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_extraction_service.py \
  backend/tests/test_memory_os_extractor.py -q
```

Expected:

- FAIL because extraction service does not emit `user_name` or `mutual_addressing`

- [ ] **Step 3: Implement deterministic extractors**

```python
def _extract_user_name(*, content: str, evidence_id: str) -> MemoryProposal | None:
    match = re.search(r"(?:我叫|我的名字是)([^，。！；\\s]{2,16})", content)
    if match is None:
        return None
    return _proposal(
        proposed_domain="user_identity",
        proposed_kind="user_name",
        candidate_claim=content,
        candidate_payload={"user_name": _clean_fragment(match.group(1))},
        supporting_evidence_ids=[evidence_id],
        estimated_stability="stable",
        estimated_salience=0.95,
        estimated_confidence=0.97,
        change_type="new",
        judge_hints=["explicit_user_statement", "identity_name_signal"],
    )
```

```python
def _extract_mutual_addressing(*, content: str, evidence_id: str) -> MemoryProposal | None:
    match = re.search(r"你(?:以后)?叫我([^，。！；\\s]{1,12}).*我叫你([^，。！；\\s]{1,12})", content)
    if match is None:
        return None
    return _proposal(
        proposed_domain="user_identity",
        proposed_kind="mutual_addressing",
        candidate_claim=content,
        candidate_payload={
            "preferred_address_for_user": _clean_fragment(match.group(1)),
            "assistant_self_name": _clean_fragment(match.group(2)),
            "mutual_addressing_rule": content.strip(),
        },
        supporting_evidence_ids=[evidence_id],
        estimated_stability="stable",
        estimated_salience=0.96,
        estimated_confidence=0.98,
        change_type="new",
        judge_hints=["explicit_user_statement", "mutual_addressing_signal"],
    )
```

Wire these into `_extract_from_content()` before generic relationship extraction.

- [ ] **Step 4: Map new proposal kinds to candidate subtypes**

Update `backend/packages/harness/nion/memory_os/extractor.py`:

```python
    subtype_map = {
        "explicit_preference": "communication_preference",
        "work_context": "work_context",
        "address_style": "address_style",
        "initiative_boundary": "initiative_policy",
        "learning_topic_hint": "topic",
        "user_name": "identity_name",
        "mutual_addressing": "mutual_addressing",
        "assistant_self_name": "assistant_self_name",
        "communication_contract": "communication_contract",
    }
```

- [ ] **Step 5: Run the tests again**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_extraction_service.py \
  backend/tests/test_memory_os_extractor.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit the extraction work**

```bash
git add backend/packages/harness/nion/memory/extraction/models.py \
  backend/packages/harness/nion/memory/extraction/service.py \
  backend/packages/harness/nion/memory_os/extractor.py \
  backend/tests/test_memory_extraction_service.py \
  backend/tests/test_memory_os_extractor.py
git commit -m "Extract user identity and mutual addressing signals"
```

## Task 3: Inject User Identity As Always-On Runtime Context

**Files:**
- Create: `backend/packages/harness/nion/user_identity/runtime.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/models.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/packages/harness/nion/memory_os/context_assembler.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Modify: `backend/tests/test_runtime_memory_engine.py`
- Modify: `backend/tests/test_memory_runtime_soul_bundle.py`

- [ ] **Step 1: Write failing runtime tests**

```python
def test_build_runtime_memory_context_includes_user_identity_profile_even_without_query_match(tmp_path):
    from nion.memory.runtime_engine.service import build_runtime_memory_context
    from nion.user_identity.models import UserIdentityProfile
    from nion.user_identity.repository import UserIdentityRepository

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    UserIdentityRepository(tmp_path).save(
        UserIdentityProfile(
            user_name="张天成",
            preferred_address_for_user="大哥",
            assistant_self_name="小老弟",
            mutual_addressing_rule="你叫我大哥，我叫你小老弟",
        )
    )

    result = build_runtime_memory_context(
        repository=repo,
        query="你知道我叫啥不",
        thread_id="thread-1",
        memory_read=True,
        base_dir=tmp_path,
    )

    assert result.sections.user_identity_profile is not None
    assert "张天成" in result.sections.user_identity_profile
    assert "大哥" in result.sections.user_identity_profile
```

- [ ] **Step 2: Run the runtime tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_runtime_memory_engine.py \
  backend/tests/test_memory_runtime_soul_bundle.py -q
```

Expected:

- FAIL because runtime sections do not yet have `user_identity_profile`

- [ ] **Step 3: Extend runtime models and builder**

Update `backend/packages/harness/nion/memory/runtime_engine/models.py`:

```python
class RuntimeMemorySections(BaseModel):
    user_identity_profile: str | None = None
    core_identity: str | None = None
    speech_style: str | None = None
    values_and_boundaries: str | None = None
    relationship_stance: str | None = None
    adaptive_overlay: str | None = None
    ...
```

Create `backend/packages/harness/nion/user_identity/runtime.py`:

```python
from pathlib import Path

from nion.user_identity.repository import UserIdentityRepository


def build_runtime_user_identity_summary(base_dir: str | Path) -> str | None:
    profile = UserIdentityRepository(base_dir).load()
    parts: list[str] = []
    if profile.user_name:
        parts.append(f"用户姓名：{profile.user_name}")
    if profile.preferred_address_for_user:
        parts.append(f"称呼用户：{profile.preferred_address_for_user}")
    if profile.assistant_self_name:
        parts.append(f"助手自称：{profile.assistant_self_name}")
    if profile.mutual_addressing_rule:
        parts.append(f"互称规则：{profile.mutual_addressing_rule}")
    if profile.communication_style_preferences:
        parts.append("沟通偏好：" + " / ".join(profile.communication_style_preferences))
    return "\n".join(parts) or None
```

Use it in `build_runtime_memory_context(...)`.

- [ ] **Step 4: Reorder prompt/context pack output**

Update `backend/packages/harness/nion/memory_os/context_assembler.py` so runtime pack ordering starts with:

```python
("User Identity", sections.user_identity_profile),
("Core Identity", sections.core_identity),
("Speech Style", sections.speech_style),
```

Update `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py` to pass `base_dir=self._paths.base_dir` into `build_runtime_memory_pack(...)`.

- [ ] **Step 5: Run the runtime tests again**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_runtime_memory_engine.py \
  backend/tests/test_memory_runtime_soul_bundle.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit the runtime work**

```bash
git add backend/packages/harness/nion/user_identity/runtime.py \
  backend/packages/harness/nion/memory/runtime_engine/models.py \
  backend/packages/harness/nion/memory/runtime_engine/service.py \
  backend/packages/harness/nion/memory_os/context_assembler.py \
  backend/packages/harness/nion/agents/middlewares/continuity_middleware.py \
  backend/tests/test_runtime_memory_engine.py \
  backend/tests/test_memory_runtime_soul_bundle.py
git commit -m "Inject user identity as always-on runtime context"
```

## Task 4: Apply Explicit Chat Declarations Immediately

**Files:**
- Create: `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `backend/packages/harness/nion/user_identity/service.py`
- Create: `backend/tests/test_user_identity_middleware.py`

- [ ] **Step 1: Write failing middleware tests**

```python
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from nion.agents.middlewares.user_identity_middleware import UserIdentityMiddleware


def test_user_identity_middleware_applies_explicit_name_and_addressing_before_model(tmp_path):
    middleware = UserIdentityMiddleware(base_dir=tmp_path)

    result = middleware.before_model(
        state={"messages": [HumanMessage(content="我叫张天成，你以后叫我大哥，我叫你小老弟。")]},
        runtime=Runtime(context={"thread_id": "thread-1"}),
    )

    assert result is None
    profile = middleware._service.get_profile()
    assert profile.user_name == "张天成"
    assert profile.preferred_address_for_user == "大哥"
    assert profile.assistant_self_name == "小老弟"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_user_identity_middleware.py -q
```

Expected:

- FAIL because middleware does not yet exist

- [ ] **Step 3: Implement direct-apply profile patching**

Update `backend/packages/harness/nion/user_identity/service.py`:

```python
    def apply_patch(self, patch: dict[str, object]) -> UserIdentityProfile:
        current = self.get_profile()
        update = {k: v for k, v in patch.items() if v not in (None, "", [])}
        if not update:
            return current
        return self.replace_profile(current.model_copy(update=update))
```

Create `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`:

```python
from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langgraph.runtime import Runtime

from nion.memory.extraction.service import extract_memory_proposals_from_evidence
from nion.memory_os.extractor import _human_evidence_documents
from nion.user_identity.repository import UserIdentityRepository
from nion.user_identity.service import UserIdentityService


class UserIdentityMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir=None):
        super().__init__()
        self._service = UserIdentityService(UserIdentityRepository(base_dir or "."))

    def before_model(self, state: AgentState, runtime: Runtime):
        thread_id = runtime.context.get("thread_id") if runtime.context else "thread:unknown"
        proposals = extract_memory_proposals_from_evidence(
            evidence_documents=_human_evidence_documents(
                messages=state.get("messages", []),
                thread_id=thread_id,
            )
        )
        patch: dict[str, object] = {}
        for proposal in proposals:
            if proposal.proposed_kind == "user_name":
                patch["user_name"] = proposal.candidate_payload["user_name"]
            elif proposal.proposed_kind == "mutual_addressing":
                patch.update(proposal.candidate_payload)
            elif proposal.proposed_kind == "explicit_preference":
                patch["communication_style_preferences"] = proposal.candidate_payload["preference_hints"]
        if patch:
            self._service.apply_patch(patch)
        return None
```

- [ ] **Step 4: Register the middleware before continuity**

Modify `_build_middlewares(...)` in `backend/packages/harness/nion/agents/lead_agent/agent.py`:

```python
from nion.agents.middlewares.user_identity_middleware import UserIdentityMiddleware
...
middlewares.append(UserIdentityMiddleware())
middlewares.append(RecallCaptureMiddleware(agent_name=agent_name or "lead_agent"))
middlewares.append(ContinuityMiddleware())
```

- [ ] **Step 5: Run the middleware tests again**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_user_identity_middleware.py \
  backend/tests/test_user_identity_service.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit the direct-apply path**

```bash
git add backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py \
  backend/packages/harness/nion/agents/lead_agent/agent.py \
  backend/packages/harness/nion/user_identity/service.py \
  backend/tests/test_user_identity_middleware.py \
  backend/tests/test_user_identity_service.py
git commit -m "Apply explicit user identity changes directly from chat"
```

## Task 5: Replace Soul Draft Workflow With Immediate Tuning Panels

**Files:**
- Modify: `backend/app/gateway/routers/user_identity.py`
- Create: `frontend/src/core/user-identity/types.ts`
- Create: `frontend/src/core/user-identity/api.ts`
- Create: `frontend/src/core/user-identity/hooks.ts`
- Create: `frontend/src/components/workspace/settings/user-identity-panel.tsx`
- Create: `frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`
- Modify: `frontend/src/core/soul-settings/types.ts`
- Modify: `frontend/src/core/soul-settings/api.ts`
- Modify: `frontend/src/core/soul-settings/hooks.ts`
- Modify: `backend/tests/test_user_identity_router.py`
- Modify: `backend/app/gateway/routers/memory_soul.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`
- Modify: `backend/tests/test_memory_soul_router.py`

- [ ] **Step 1: Write failing frontend contract tests**

```ts
// frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("user identity panel exposes inline tuning instead of a bulk draft form", async () => {
  const source = await readFile(
    new URL("./user-identity-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /用户姓名|称呼你|我的自称|沟通偏好/);
  assert.doesNotMatch(source, /草稿/);
  assert.doesNotMatch(source, /统一应用/);
});
```

Update `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`:

```ts
  assert.doesNotMatch(source, /草稿应用/);
  assert.doesNotMatch(source, /当前没有未保存的改动/);
```

- [ ] **Step 2: Run the frontend tests to verify they fail**

Run:

```bash
cd frontend && node --test \
  src/components/workspace/settings/user-identity-panel.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts
```

Expected:

- FAIL because user-identity panel does not yet exist and Soul page still exposes draft/apply workflow

- [ ] **Step 3: Add field-level PATCH APIs**

Update `backend/app/gateway/routers/user_identity.py`:

```python
from typing import Literal

from pydantic import BaseModel


class UserIdentityPatchRequest(BaseModel):
    field: Literal[
        "user_name",
        "preferred_address_for_user",
        "assistant_self_name",
        "mutual_addressing_rule",
        "user_role",
        "timezone",
        "long_term_background_summary",
    ]
    value: str


@router.patch("")
async def patch_user_identity(request: UserIdentityPatchRequest):
    return _service().apply_patch({request.field: request.value}).model_dump(mode="json")
```

Update `backend/tests/test_user_identity_router.py` to cover field-level patch write-through.

Update `backend/app/gateway/routers/memory_soul.py`:

```python
from typing import Literal


class SoulSettingsPatchRequest(BaseModel):
    field: Literal["core_identity", "speech_style", "values_and_boundaries", "relationship_stance"]
    value: str


@router.patch("")
async def patch_soul_setting(request: SoulSettingsPatchRequest):
    return patch_soul_setting_value(
        _repo(),
        field=request.field,
        value=request.value,
        created_at=utcnow_z(),
    )
```

Update `backend/packages/harness/nion/memory/soul/console_service.py`:

```python
def patch_soul_setting_value(repository, *, field: str, value: str, created_at: str, actor: str = "user:default"):
    # map one field to one stable record update and return {"action": "patch", "field": field, "value": value}
```

Create frontend user-identity API/hooks around `/api/user-identity`.

- [ ] **Step 4: Build the immediate tuning panels**

`frontend/src/components/workspace/settings/user-identity-panel.tsx`

```tsx
export function UserIdentityPanel() {
  // current value
  // local input
  // save on blur or per-card save
}
```

`frontend/src/components/workspace/settings/soul-settings-page.tsx`

Restructure to:

```tsx
<UserIdentityPanel />
<SoulFieldCard field="core_identity" />
<SoulFieldCard field="speech_style" />
<SoulFieldCard field="values_and_boundaries" />
<SoulFieldCard field="relationship_stance" />
```

Each card should:

- show current value
- allow local edit
- PATCH immediately
- show light success / error feedback

- [ ] **Step 5: Run frontend tests and typecheck**

Run:

```bash
cd frontend && node --test \
  src/components/workspace/settings/user-identity-panel.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts \
  src/components/workspace/settings/settings-dialog.labels.contract.test.ts \
  src/components/workspace/settings/settings-dialog.layout.contract.test.ts

pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 6: Commit the interaction layer**

```bash
git add frontend/src/core/user-identity \
  frontend/src/components/workspace/settings/user-identity-panel.tsx \
  frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts \
  frontend/src/components/workspace/settings/soul-settings-page.tsx \
  frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts \
  frontend/src/core/soul-settings \
  backend/app/gateway/routers/user_identity.py \
  backend/app/gateway/routers/memory_soul.py \
  backend/packages/harness/nion/memory/soul/console_service.py \
  backend/tests/test_user_identity_router.py \
  backend/tests/test_memory_soul_router.py
git commit -m "Turn user identity and soul settings into immediate tuning panels"
```

## Task 6: Upgrade Acceptance Coverage And Final Verification

**Files:**
- Modify: `docs/test/10-memory-soul/behavioral-acceptance-questions.md`
- Create/Modify: `artifacts/dogfood/<new-run>/report.md`

- [ ] **Step 1: Add identity-and-addressing acceptance questions**

Append:

```md
### 题：用户名字跨线程回忆
先说：`我叫张天成。`
新线程问：`我叫什么？`
通过标准：必须回答“张天成”。

### 题：双向称谓跨线程回忆
先说：`以后你叫我大哥，我叫你小老弟。`
新线程问：
- `你该怎么叫我？`
- `我该怎么叫你？`
通过标准：两边都必须答对。
```

- [ ] **Step 2: Run full verification**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests -q
pnpm --dir frontend typecheck
pnpm --dir desktop test
```

Expected:

- PASS

- [ ] **Step 3: Run targeted dogfood**

Required flow:

1. 聊天中说：`我叫张天成，你以后叫我大哥，我叫你小老弟。`
2. 同线程追问：`我叫什么？`
3. 新线程再问：
   - `我叫什么？`
   - `你该怎么叫我？`
   - `我该怎么叫你？`
4. 再说：`以后你回答冷静一点，先给结论。`
5. 新线程回查：`我喜欢你怎么回答？`

Expected:

- 名字、称谓、风格都稳定命中

- [ ] **Step 4: Commit final acceptance artifacts**

```bash
git add docs/test/10-memory-soul/behavioral-acceptance-questions.md artifacts/dogfood
git commit -m "Verify user identity memory and direct soul tuning behavior"
```
