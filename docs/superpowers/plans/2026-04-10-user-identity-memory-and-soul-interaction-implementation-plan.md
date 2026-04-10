# User Identity Memory Layer And Soul Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Nion 增加稳定的用户身份记忆层，让名字、双向称谓、长期沟通偏好跨线程稳定生效，并把 Soul 从重草稿表单改成聊天优先、设置页即时生效的轻调教交互。

**Architecture:** 这轮实现按“先 owner、再提取、再注入、再交互”的顺序推进。第一批先建立 `UserIdentityProfile` 的正式后端 owner 和 API 合同；第二批把名字/称谓/风格声明接入直接写入稳定层的聊天链路；第三批把 runtime 改成 always-on identity + soul baseline；第四批改设置页为卡片式即时生效面板，并补行为验收和 dogfood。Task 2、Task 3、Task 4 在 Task 1 稳定后可以并行。

**Tech Stack:** Python, FastAPI routers, LangChain/LangGraph middleware, SQLite/JSON persistence, React, TypeScript, node:test, pytest, agent-browser dogfood

---

## File Map

### Backend: user identity owner

- Create: `backend/packages/harness/nion/user_identity/__init__.py`
- Create: `backend/packages/harness/nion/user_identity/models.py`
- Create: `backend/packages/harness/nion/user_identity/repository.py`
- Create: `backend/packages/harness/nion/user_identity/service.py`
- Create: `backend/packages/harness/nion/user_identity/runtime.py`
- Create: `backend/app/gateway/routers/user_identity.py`

### Backend: extraction and chat-first mutation

- Modify: `backend/packages/harness/nion/memory/extraction/models.py`
- Modify: `backend/packages/harness/nion/memory/extraction/service.py`
- Modify: `backend/packages/harness/nion/memory_os/extractor.py`
- Create: `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`

### Backend: runtime injection

- Modify: `backend/packages/harness/nion/memory/runtime_engine/models.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/packages/harness/nion/memory_os/context_assembler.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`

### Backend: soul write path

- Modify: `backend/app/gateway/routers/memory_soul.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`

### Frontend: user identity and soul interaction

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

### Tests / acceptance

- Create: `backend/tests/test_user_identity_repository.py`
- Create: `backend/tests/test_user_identity_service.py`
- Create: `backend/tests/test_user_identity_router.py`
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
- Create: `backend/tests/test_user_identity_repository.py`
- Create: `backend/tests/test_user_identity_service.py`
- Create: `backend/tests/test_user_identity_router.py`

- [ ] **Step 1: Write the failing repository tests**

```python
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
from fastapi.testclient import TestClient
from app.gateway.app import create_app


def test_user_identity_router_exposes_profile(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    with TestClient(create_app()) as client:
        response = client.get("/api/user-identity")

    assert response.status_code == 200
    assert response.json()["user_name"] == ""
```

- [ ] **Step 2: Run the new backend tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_user_identity_repository.py \
  backend/tests/test_user_identity_service.py \
  backend/tests/test_user_identity_router.py -q
```

Expected:

- FAIL because `nion.user_identity` package and `/api/user-identity` router do not exist yet

- [ ] **Step 3: Create the stable profile model and repository**

Implementation skeleton:

`backend/packages/harness/nion/user_identity/models.py`

```python
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

`backend/packages/harness/nion/user_identity/repository.py`

```python
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
        self._path.write_text(
            profile.model_dump_json(indent=2),
            encoding="utf-8",
        )
        return profile
```

`backend/packages/harness/nion/user_identity/service.py`

```python
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

- [ ] **Step 4: Add the router contract**

`backend/app/gateway/routers/user_identity.py`

```python
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

- [ ] **Step 5: Run the targeted tests again**

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

- [ ] **Step 1: Write failing extraction tests for names and mutual addressing**

Add to `backend/tests/test_memory_extraction_service.py`:

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

Add to `backend/tests/test_memory_os_extractor.py`:

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

- [ ] **Step 3: Extend proposal kinds**

`backend/packages/harness/nion/memory/extraction/models.py`

Add new kinds in usage, without changing `MemoryProposal` shape:

```python
# New proposed_kind values used by extraction.service:
# - user_name
# - user_alias
# - assistant_self_name
# - mutual_addressing
# - communication_contract
```

`backend/packages/harness/nion/memory/extraction/service.py`

Add deterministic extractors:

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

Wire them into `_extract_from_content()`.

- [ ] **Step 4: Map the new proposal kinds into candidate subtypes**

`backend/packages/harness/nion/memory_os/extractor.py`

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

- [ ] **Step 5: Run the extraction tests again**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_extraction_service.py \
  backend/tests/test_memory_os_extractor.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit the extraction layer**

```bash
git add backend/packages/harness/nion/memory/extraction/models.py \
  backend/packages/harness/nion/memory/extraction/service.py \
  backend/packages/harness/nion/memory_os/extractor.py \
  backend/tests/test_memory_extraction_service.py \
  backend/tests/test_memory_os_extractor.py
git commit -m "Extract user identity and mutual addressing signals"
```

## Task 3: Make User Identity Always-On In Runtime

**Files:**
- Create: `backend/packages/harness/nion/user_identity/runtime.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/models.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Modify: `backend/packages/harness/nion/memory_os/context_assembler.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Modify: `backend/tests/test_runtime_memory_engine.py`
- Modify: `backend/tests/test_memory_runtime_soul_bundle.py`

- [ ] **Step 1: Write failing runtime tests for always-on user identity**

Add to `backend/tests/test_runtime_memory_engine.py`:

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

`backend/packages/harness/nion/memory/runtime_engine/models.py`

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

`backend/packages/harness/nion/user_identity/runtime.py`

```python
from nion.user_identity.repository import UserIdentityRepository


def build_runtime_user_identity_summary(base_dir) -> str | None:
    profile = UserIdentityRepository(base_dir).load()
    parts = []
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
    return "\\n".join(parts) or None
```

`backend/packages/harness/nion/memory/runtime_engine/service.py`

Add `base_dir` parameter and inject:

```python
user_identity_profile=build_runtime_user_identity_summary(base_dir),
```

- [ ] **Step 4: Make prompt/continuity consume the new always-on identity block**

`backend/packages/harness/nion/memory_os/context_assembler.py`

Update `runtime_memory_to_context_pack()` ordering so identity comes before soul:

```python
("User Identity", sections.user_identity_profile),
("Core Identity", sections.core_identity),
...
```

`backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`

Pass `base_dir=self._paths.base_dir` into `build_runtime_memory_pack(...)`.

- [ ] **Step 5: Run the runtime tests again**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_runtime_memory_engine.py \
  backend/tests/test_memory_runtime_soul_bundle.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit the runtime layer**

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
- Modify: `backend/tests/test_user_identity_service.py`
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

- [ ] **Step 2: Run the middleware tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_user_identity_middleware.py -q
```

Expected:

- FAIL because middleware does not exist

- [ ] **Step 3: Implement direct-apply update methods**

`backend/packages/harness/nion/user_identity/service.py`

Add:

```python
    def apply_patch(self, patch: dict[str, object]) -> UserIdentityProfile:
        current = self.get_profile()
        update = {k: v for k, v in patch.items() if v not in (None, "", [])}
        return self.replace_profile(current.model_copy(update=update))
```

`backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`

```python
from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from nion.user_identity.repository import UserIdentityRepository
from nion.user_identity.service import UserIdentityService
from nion.memory.extraction.service import extract_memory_proposals_from_evidence
from nion.memory_os.extractor import _human_evidence_documents


class UserIdentityMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir=None):
        super().__init__()
        self._service = UserIdentityService(UserIdentityRepository(base_dir or "."))

    def before_model(self, state: AgentState, runtime: Runtime):
        thread_id = runtime.context.get("thread_id") if runtime.context else "thread:unknown"
        messages = state.get("messages", [])
        proposals = extract_memory_proposals_from_evidence(
            evidence_documents=_human_evidence_documents(messages=messages, thread_id=thread_id)
        )
        patch = {}
        for proposal in proposals:
            if proposal.proposed_kind == "user_name":
                patch["user_name"] = proposal.candidate_payload["user_name"]
            if proposal.proposed_kind == "mutual_addressing":
                patch.update(proposal.candidate_payload)
            if proposal.proposed_kind == "explicit_preference":
                patch["communication_style_preferences"] = proposal.candidate_payload["preference_hints"]
        if patch:
            self._service.apply_patch(patch)
        return None
```

- [ ] **Step 4: Register the middleware before continuity**

`backend/packages/harness/nion/agents/lead_agent/agent.py`

In `_build_middlewares(...)`, insert:

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

## Task 5: Replace Soul Draft Form With Immediate Tuning Panels

**Files:**
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
- Modify: `backend/app/gateway/routers/memory_soul.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`
- Modify: `backend/tests/test_memory_soul_router.py`

- [ ] **Step 1: Write failing frontend contract tests for immediate tuning**

Add `frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("user identity panel exposes inline save interactions instead of a draft form", async () => {
  const source = await readFile(
    new URL("./user-identity-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /用户姓名|称呼你|我的自称|沟通偏好/);
  assert.doesNotMatch(source, /草稿/);
  assert.doesNotMatch(source, /统一应用/);
});
```

Update `soul-settings-page.contract.test.ts`:

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

- FAIL because user-identity panel does not exist and Soul page still uses draft/apply structure

- [ ] **Step 3: Add field-level PATCH APIs**

`backend/app/gateway/routers/memory_soul.py`

```python
class SoulSettingsPatchRequest(BaseModel):
    field: Literal["core_identity", "speech_style", "values_and_boundaries", "relationship_stance"]
    value: str


@router.patch("")
async def patch_soul_setting(request: SoulSettingsPatchRequest):
    return patch_soul_setting_value(_repo(), field=request.field, value=request.value, created_at=utcnow_z())
```

`backend/packages/harness/nion/memory/soul/console_service.py`

```python
def patch_soul_setting_value(...):
    # map one field to one stable record/update and return the updated field/value
```

Create `frontend/src/core/user-identity/api.ts` and `hooks.ts` with matching GET/PATCH calls to `/api/user-identity`.

- [ ] **Step 4: Build the tuning panels**

`frontend/src/components/workspace/settings/user-identity-panel.tsx`

```tsx
export function UserIdentityPanel() {
  // one card per field cluster
  // local editing state
  // save on blur or explicit per-card save
}
```

`frontend/src/components/workspace/settings/soul-settings-page.tsx`

Replace the bulk draft/apply section with:

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
- write immediately via field-level mutation
- show light success/error state

- [ ] **Step 5: Run frontend contract tests and typecheck**

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

- [ ] **Step 6: Commit the immediate tuning UI**

```bash
git add frontend/src/core/user-identity \
  frontend/src/components/workspace/settings/user-identity-panel.tsx \
  frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts \
  frontend/src/components/workspace/settings/soul-settings-page.tsx \
  frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts \
  frontend/src/core/soul-settings \
  backend/app/gateway/routers/memory_soul.py \
  backend/packages/harness/nion/memory/soul/console_service.py \
  backend/tests/test_memory_soul_router.py
git commit -m "Turn Soul settings into immediate tuning panels"
```

## Task 6: Upgrade Acceptance Coverage And Final Verification

**Files:**
- Modify: `docs/test/10-memory-soul/behavioral-acceptance-questions.md`
- Create/Modify: `artifacts/dogfood/<new-run>/report.md`

- [ ] **Step 1: Add identity-and-addressing behavior questions**

Append to `docs/test/10-memory-soul/behavioral-acceptance-questions.md`:

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

- [ ] **Step 2: Run full backend / frontend / desktop verification**

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
4. 聊天中再说：`以后你说话冷静一点，先给结论。`
5. 新线程回查：
   - `我喜欢你怎么回答？`

Expected:

- 名字、称谓、风格都稳定命中

- [ ] **Step 4: Commit final acceptance artifacts**

```bash
git add docs/test/10-memory-soul/behavioral-acceptance-questions.md artifacts/dogfood
git commit -m "Verify user identity memory and direct Soul tuning behavior"
```
