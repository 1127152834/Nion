# Memory / Soul / User Identity Mainline Closure (Subproject A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 `Memory / Soul / UserIdentity` 的真实主链，让聊天与设置都能稳定修改身份与 Soul，并让 Memory 页面展示真正的稳定身份记忆。

**Architecture:** 这轮不再扩系统外沿，而是收紧主链。后端新增 `chat -> stable soul` 写入能力，扩展 `UserIdentityProfile` 的业务落地，并把稳定身份正式投影进 `/api/memory`。前端同步做两件事：一是修掉 `UserIdentityPanel` 的输入丢失问题，二是把 `Memory UI / Soul UI` 从当前半成品状态重构成真正的用户面，同时下线假 embedding 面板和错误的控制台式产品面。

**Tech Stack:** Python, FastAPI, LangChain/LangGraph middleware, React, TypeScript, node:test, pytest

---

## File Map

### Stable write path

- Create: `backend/tests/test_soul_chat_write_path.py`
- Modify: `backend/packages/harness/nion/memory/extraction/service.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`
- Modify: `backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`

### User identity extended fields + memory projection

- Modify: `backend/packages/harness/nion/user_identity/models.py`
- Modify: `backend/app/gateway/routers/user_identity.py`
- Modify: `backend/packages/harness/nion/memory_os/compat.py`
- Modify: `backend/tests/test_user_identity_router.py`
- Modify: `backend/tests/test_memory_router.py`
- Modify: `frontend/src/core/user-identity/types.ts`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-user-page.tsx`
- Modify: `frontend/src/core/memory/search.ts`

### Product surface cleanup

- Modify: `frontend/src/components/workspace/settings/user-identity-panel.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Delete: `frontend/src/components/workspace/settings/memory-embedding-panel.tsx`
- Modify: `frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-user-page.contract.test.ts`
- Delete: `frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.config.test.ts`

### Acceptance

- Modify: `docs/test/10-memory-soul/behavioral-acceptance-questions.md`
- Create/Modify: `artifacts/dogfood/electron-memory-soul-mainline-closure-2026-04-11/report.md`

## Task 1: Add `chat -> stable soul` Direct Write Path

**Files:**
- Create: `backend/tests/test_soul_chat_write_path.py`
- Modify: `backend/packages/harness/nion/memory/extraction/service.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`
- Modify: `backend/packages/harness/nion/memory/soul/console_service.py`

- [ ] **Step 1: Write the failing soul-chat tests**

```python
# backend/tests/test_soul_chat_write_path.py
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from nion.agents.middlewares.user_identity_middleware import UserIdentityMiddleware
from nion.memory.soul.console_service import build_soul_settings_payload
from nion.memory_os.repository import MemoryOSRepository


def test_chat_updates_stable_speech_style_from_explicit_long_term_instruction(tmp_path):
    middleware = UserIdentityMiddleware(base_dir=tmp_path)

    middleware.before_agent(
        {
            "messages": [
                HumanMessage(content="以后你回答冷静一点，先给结论，别太热情。"),
            ]
        },
        Runtime(context={"thread_id": "thread-1"}),
    )

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    settings = build_soul_settings_payload(repo, now_z="2026-04-11T00:00:00Z")

    assert settings["speech_style"] == "冷静、先给结论、少热情。"


def test_chat_updates_values_and_relationship_stance_from_explicit_long_term_instruction(tmp_path):
    middleware = UserIdentityMiddleware(base_dir=tmp_path)

    middleware.before_agent(
        {
            "messages": [
                HumanMessage(content="你以后不要替我拍板，关系上低刺激一点，少施压。"),
            ]
        },
        Runtime(context={"thread_id": "thread-1"}),
    )

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    settings = build_soul_settings_payload(repo, now_z="2026-04-11T00:00:00Z")

    assert settings["values_and_boundaries"] == "不替用户拍板。"
    assert settings["relationship_stance"] == "低刺激、少施压。"
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_soul_chat_write_path.py -q
```

Expected:

- FAIL because current extraction/middleware path does not emit or write stable soul fields

- [ ] **Step 3: Add explicit soul signal extractors**

Update `backend/packages/harness/nion/memory/extraction/service.py`:

```python
def _extract_soul_speech_style(*, content: str, evidence_id: str) -> MemoryProposal | None:
    if "以后你回答" not in content and "你以后" not in content:
        return None
    hints: list[str] = []
    if "冷静" in content:
        hints.append("冷静")
    if "先给结论" in content:
        hints.append("先给结论")
    if "别太热情" in content or "少热情" in content:
        hints.append("少热情")
    if not hints:
        return None
    return _proposal(
        proposed_domain="soul",
        proposed_kind="soul_speech_style",
        candidate_claim=content,
        candidate_payload={"speech_style": "、".join(hints) + "。"},
        supporting_evidence_ids=[evidence_id],
        estimated_stability="stable",
        estimated_salience=0.91,
        estimated_confidence=0.94,
        change_type="new",
        judge_hints=["explicit_user_statement", "stable_soul_signal"],
    )
```

Also add parallel extractors for:

- `soul_values_and_boundaries`
- `soul_relationship_stance`

Wire them into `_extract_from_content(...)` ahead of generic preference extraction.

- [ ] **Step 4: Extend the middleware to patch stable soul**

Update `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py`:

```python
from nion.memory.soul.console_service import patch_soul_setting_value
from nion.memory_os.clock import utcnow_z
from nion.memory_os.repository import MemoryOSRepository

class UserIdentityMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir: str | None = None) -> None:
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._service = UserIdentityService(UserIdentityRepository(self._paths.base_dir))
        self._memory_repo = MemoryOSRepository(self._paths.memory_os_index_db_file)

    elif proposal.proposed_kind == "soul_speech_style":
        patch_soul_setting_value(
            self._memory_repo,
            field="speech_style",
            value=proposal.candidate_payload["speech_style"],
                    created_at=utcnow_z(),
                )
            elif proposal.proposed_kind == "soul_values_and_boundaries":
                patch_soul_setting_value(
                    self._memory_repo,
                    field="values_and_boundaries",
                    value=proposal.candidate_payload["values_and_boundaries"],
                    created_at=utcnow_z(),
                )
            elif proposal.proposed_kind == "soul_relationship_stance":
                patch_soul_setting_value(
                    self._memory_repo,
                    field="relationship_stance",
                    value=proposal.candidate_payload["relationship_stance"],
                    created_at=utcnow_z(),
                )
```

- [ ] **Step 5: Make `initialize_soul_profile` write all stable fields**

Update `backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py`:

```python
from nion.memory.soul.console_service import patch_soul_setting_value
from nion.memory_os.clock import utcnow_z

@tool("initialize_soul_profile", parse_docstring=True)
def initialize_soul_profile(
    personality_summary: str,
    values: list[str] | None = None,
    style_preferences: list[str] | None = None,
) -> str:
    created_at = utcnow_z()
    patch_soul_setting_value(repo, field="core_identity", value=summary, created_at=created_at)
    if style_preferences:
        patch_soul_setting_value(
            repo,
            field="speech_style",
            value="；".join(item.strip() for item in style_preferences if item.strip()),
            created_at=created_at,
        )
    if values:
        patch_soul_setting_value(
            repo,
            field="values_and_boundaries",
            value="；".join(item.strip() for item in values if item.strip()),
            created_at=created_at,
        )
```

- [ ] **Step 6: Re-run targeted tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_soul_chat_write_path.py \
  backend/tests/test_user_identity_middleware.py \
  backend/tests/test_soul_onboarding_tool.py -q
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```bash
git add backend/tests/test_soul_chat_write_path.py \
  backend/packages/harness/nion/memory/extraction/service.py \
  backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py \
  backend/packages/harness/nion/memory/soul/console_service.py \
  backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py
git commit -m "Land the chat-to-stable-soul write path"
```

## Task 2: Land Extended `UserIdentityProfile` Fields End-to-End

**Files:**
- Modify: `backend/packages/harness/nion/user_identity/models.py`
- Modify: `backend/app/gateway/routers/user_identity.py`
- Modify: `backend/packages/harness/nion/memory/extraction/service.py`
- Modify: `frontend/src/core/user-identity/types.ts`
- Modify: `frontend/src/components/workspace/settings/user-identity-panel.tsx`
- Modify: `backend/tests/test_user_identity_router.py`

- [ ] **Step 1: Write the failing extended-field tests**

```python
def test_user_identity_router_patches_extended_fields(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        role = client.patch("/api/user-identity", json={"field": "user_role", "value": "财务 BP"})
        timezone = client.patch("/api/user-identity", json={"field": "timezone", "value": "Asia/Shanghai"})
        background = client.patch(
            "/api/user-identity",
            json={"field": "long_term_background_summary", "value": "长期负责经营分析与月度复盘。"},
        )
        profile = client.get("/api/user-identity")

    assert role.status_code == 200
    assert timezone.status_code == 200
    assert background.status_code == 200
    assert profile.json()["user_role"] == "财务 BP"
    assert profile.json()["timezone"] == "Asia/Shanghai"
    assert profile.json()["long_term_background_summary"] == "长期负责经营分析与月度复盘。"
```

Add a frontend contract assertion:

```ts
assert.match(source, /用户角色|时区|长期背景/);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_user_identity_router.py -q
cd frontend && pnpm exec node --test src/components/workspace/settings/user-identity-panel.contract.test.ts
```

Expected:

- FAIL because the panel and route do not yet expose all extended fields

- [ ] **Step 3: Extend the router contract and form**

Update `backend/app/gateway/routers/user_identity.py` so `field` also supports:

```python
"interaction_boundaries",
"user_aliases",
```

Normalize:

```python
if field in {"communication_style_preferences", "interaction_boundaries", "user_aliases"}:
    return _normalize_preference_values(value)
```

Update `frontend/src/components/workspace/settings/user-identity-panel.tsx` to add cards for:

- `用户角色`
- `时区`
- `长期背景`

- [ ] **Step 4: Add minimal chat extraction for role/timezone**

Update `backend/packages/harness/nion/memory/extraction/service.py`:

```python
def _extract_user_role(*, content: str, evidence_id: str) -> MemoryProposal | None:
    match = re.search(r"(?:我是|我主要负责)([^，。！？]{2,24})", content)
    if match is None:
        return None
    role = _clean_fragment(match.group(1))
    if "负责" in role:
        role = role.replace("负责", "").strip()
    if not role:
        return None
    return _proposal(
        proposed_domain="user_model",
        proposed_kind="user_role",
        candidate_claim=f"用户角色：{role}",
        candidate_payload={"user_role": role},
        supporting_evidence_ids=[evidence_id],
        estimated_stability="stable",
        estimated_salience=0.82,
        estimated_confidence=0.9,
        change_type="new",
        judge_hints=["explicit_user_statement", "identity_role_signal"],
    )
```

- [ ] **Step 5: Re-run tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_user_identity_router.py -q
cd frontend && pnpm exec node --test src/components/workspace/settings/user-identity-panel.contract.test.ts
pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/user_identity/models.py \
  backend/app/gateway/routers/user_identity.py \
  backend/packages/harness/nion/memory/extraction/service.py \
  frontend/src/core/user-identity/types.ts \
  frontend/src/components/workspace/settings/user-identity-panel.tsx \
  backend/tests/test_user_identity_router.py \
  frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts
git commit -m "Land the extended user identity fields"
```

## Task 3: Project Stable Identity Into `/api/memory` and Memory Search

**Files:**
- Modify: `backend/packages/harness/nion/memory_os/compat.py`
- Modify: `backend/tests/test_memory_router.py`
- Modify: `frontend/src/core/memory/search.ts`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-user-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-user-page.contract.test.ts`

- [ ] **Step 1: Write the failing memory projection tests**

```python
def test_memory_router_projects_user_identity_profile_into_user_profile_group(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    UserIdentityRepository(tmp_path).save(
        UserIdentityProfile(
            user_name="张天成",
            preferred_address_for_user="大哥",
            assistant_self_name="小老弟",
            communication_style_preferences=["先给结论", "直接一点"],
            user_role="财务 BP",
        )
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory")

    payload = response.json()
    assert any(item["content"] == "张天成" for item in payload["user_profile"])
    assert any(item["content"] == "大哥" for item in payload["user_profile"])
    assert any(item["content"] == "财务 BP" for item in payload["user_profile"])
```

```ts
void test("memory user page shows stable identity memory instead of correction tips", async () => {
  const source = await readFile(new URL("./memory-user-page.tsx", import.meta.url), "utf8");
  assert.match(source, /用户姓名|称呼你|我的自称|沟通偏好|用户角色|时区|长期背景/);
  assert.doesNotMatch(source, /这条记错了|别再记这个|直接告诉我/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_memory_router.py -q
cd frontend && pnpm exec node --test src/components/workspace/memory/memory-user-page.contract.test.ts
```

Expected:

- FAIL because `/api/memory` does not yet project identity fields

- [ ] **Step 3: Extend the canonical user profile projection**

Update `backend/packages/harness/nion/memory_os/compat.py`:

```python
def _user_identity_items(repository: MemoryOSRepository) -> list[dict[str, Any]]:
    profile = UserIdentityRepository(get_paths().base_dir).load()
    definitions = [
        ("user_profile.user_name", "用户姓名", profile.user_name, "用户身份主档中的姓名。"),
        ("user_profile.preferred_address", "称呼你", profile.preferred_address_for_user, "系统当前对用户的稳定称呼。"),
        ("user_profile.assistant_self_name", "我的自称", profile.assistant_self_name, "系统当前对自己的稳定自称。"),
        ("user_profile.communication_preferences", "沟通偏好", " / ".join(profile.communication_style_preferences), "长期稳定的回答方式偏好。"),
        ("user_profile.user_role", "用户角色", profile.user_role, "长期稳定的用户角色信息。"),
        ("user_profile.timezone", "时区", profile.timezone, "当前用户稳定时区。"),
        ("user_profile.long_term_background", "长期背景", profile.long_term_background_summary, "稳定的长期背景摘要。"),
    ]
```

Append these items ahead of the existing context-derived `user_profile` items.

- [ ] **Step 4: Update memory search and page copy**

Update `frontend/src/core/memory/search.ts` to search the new identity items as part of the `user_profile` group.

Update `frontend/src/components/workspace/memory/memory-home-page.tsx` and `memory-user-page.tsx` to label the group as a real stable identity/profile surface, not a correction console.

- [ ] **Step 5: Re-run tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_memory_router.py -q
cd frontend && pnpm exec node --test src/components/workspace/memory/memory-user-page.contract.test.ts
pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/memory_os/compat.py \
  backend/tests/test_memory_router.py \
  frontend/src/core/memory/search.ts \
  frontend/src/components/workspace/memory/memory-home-page.tsx \
  frontend/src/components/workspace/memory/memory-user-page.tsx \
  frontend/src/components/workspace/memory/memory-user-page.contract.test.ts
git commit -m "Project stable identity into the memory surface"
```

## Task 4: Fix `UserIdentityPanel` State Loss and Rebuild Memory / Soul Product Surfaces

**Files:**
- Modify: `frontend/src/components/workspace/settings/user-identity-panel.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Delete: `frontend/src/components/workspace/settings/memory-embedding-panel.tsx`
- Modify: `frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.config.test.ts`
- Delete: `frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts`

- [ ] **Step 1: Write the failing UI contract and behavior tests**

Add a focused behavior test:

```ts
void test("user identity panel keeps unsaved field drafts when another field is saved", async () => {
  const source = await readFile(new URL("./user-identity-panel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setDrafts\\(\\{\\s*user_name:/);
  assert.match(source, /dirty|pending|savedField|localDrafts/i);
});
```

Tighten the memory settings contract:

```ts
assert.doesNotMatch(source, /MemoryEmbeddingPanel/);
assert.doesNotMatch(source, /Search console|Danger Zone|cleanup/i);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd frontend && pnpm exec node --test \
  src/components/workspace/settings/user-identity-panel.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts
```

Expected:

- FAIL on the current draft reset pattern and fake embedding panel wiring

- [ ] **Step 3: Refactor `UserIdentityPanel` to field-level state**

Replace the current global `drafts` reset with per-field state:

```tsx
const [fieldState, setFieldState] = useState<Record<IdentityDraftKey, { value: string; dirty: boolean }>>(...)

function updateField(key: IdentityDraftKey, next: string) {
  setFieldState((current) => ({
    ...current,
    [key]: { value: next, dirty: next !== currentValues[key] },
  }));
}

function syncSavedField(key: IdentityDraftKey, next: string) {
  setFieldState((current) => ({
    ...current,
    [key]: { value: next, dirty: false },
  }));
}
```

- [ ] **Step 4: Rebuild `MemorySettingsPage` as a true settings page**

`frontend/src/components/workspace/settings/memory-settings-page.tsx` should keep only:

- runtime backend summary
- stable memory lifecycle summary
- explicit links to Memory page and Soul page

Delete:

- `MemoryEmbeddingPanel`
- `memory-console-panel` integration
- control-surface phrasing like search console / cleanup management

- [ ] **Step 5: Re-run tests**

Run:

```bash
cd frontend && pnpm exec node --test \
  src/components/workspace/settings/user-identity-panel.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts

pnpm --dir frontend typecheck
pnpm --dir frontend exec eslint \
  src/components/workspace/settings/user-identity-panel.tsx \
  src/components/workspace/settings/soul-settings-page.tsx \
  src/components/workspace/settings/memory-settings-page.tsx
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/workspace/settings/user-identity-panel.tsx \
  frontend/src/components/workspace/settings/soul-settings-page.tsx \
  frontend/src/components/workspace/settings/memory-settings-page.tsx \
  frontend/src/components/workspace/settings/user-identity-panel.contract.test.ts \
  frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts \
  frontend/src/components/workspace/settings/memory-settings-page.config.test.ts
git commit -m "Rebuild the memory and soul product surfaces around the real mainline"
```

## Task 5: Acceptance, Dogfood, and Contract Cleanup

**Files:**
- Modify: `docs/test/10-memory-soul/behavioral-acceptance-questions.md`
- Create/Modify: `artifacts/dogfood/electron-memory-soul-mainline-closure-2026-04-11/report.md`

- [ ] **Step 1: Extend the acceptance questions**

Add questions that explicitly cover:

```md
### 题：聊天直接修改 Soul 的稳定说话方式
先说：`以后你回答冷静一点，先给结论。`
新线程再问：`你现在应该怎么回答我？`
通过标准：必须体现“冷静、先给结论”，不能退回默认答法。

### 题：Memory 页面展示稳定身份记忆
先设置：姓名、互称、用户角色
再打开 `/workspace/memory`
通过标准：页面能看到这些内容，而不是只能在设置页里看到。
```

- [ ] **Step 2: Run the mainline regression bundle**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_soul_chat_write_path.py \
  backend/tests/test_user_identity_router.py \
  backend/tests/test_memory_router.py -q

cd frontend && pnpm exec node --test \
  src/components/workspace/settings/user-identity-panel.contract.test.ts \
  src/components/workspace/settings/soul-settings-page.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/components/workspace/memory/memory-user-page.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 3: Commit**

```bash
git add docs/test/10-memory-soul/behavioral-acceptance-questions.md artifacts/dogfood
git commit -m "Capture mainline-closure acceptance evidence"
```
