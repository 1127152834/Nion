# Hermes Memory Replacement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Nion's current structured `memory.json` long-term memory pipeline with a Hermes-style curated memory system backed by `MEMORY.md` and `USER.md`, while keeping transcript recall as a separate search surface.

**Architecture:** Remove the automatic post-run summarization pipeline (`MemoryMiddleware` + debounce queue + LLM updater + JSON schema) and replace it with an explicit Hermes-style `memory` tool plus frozen prompt snapshots loaded from disk at session start. Reuse Nion's existing SQLite recall stack as the session-search equivalent in the first migration so cross-session transcript search stays independent from long-term memory and the LangGraph runtime does not need a full Hermes `state.db` transplant in the same lane.

**Tech Stack:** Python 3.12, FastAPI, LangGraph middleware, LangChain tools, SQLite FTS5, React, TypeScript

---

**Execution Notes**

- Use `@test-driven-development` and `@verification-before-completion`.
- This lane deletes Nion's current structured long-term memory implementation under `backend/packages/harness/nion/agents/memory/`.
- Do **not** replace `backend/packages/harness/nion/recall/*` in this lane. Treat it as the existing `session_search` equivalent until a separate exact-parity Hermes session-store plan is approved.
- Do **not** pull Hermes CLI, gateway, cron, or Honcho dependencies into `backend/packages/harness/pyproject.toml` for the first cut.
- Add a one-time migrator from legacy `memory.json` to Hermes-style markdown memory files so existing user data is not silently discarded.
- Keep `/api/memory` as the user-facing route, but change it to a Hermes-backed response model and update all in-repo consumers.
- Remove stale config knobs tied only to the deleted structured-memory pipeline (`debounce_seconds`, `max_facts`, `fact_confidence_threshold`, `max_injection_tokens`, `model_name` if it only exists for background summarization).
- Update docs in the same lane; the repo already contains contradictory memory claims.
- If exact Hermes `state.db` parity or Honcho user modeling becomes a hard requirement, stop after this plan and write a separate follow-up plan instead of stretching this lane.

### Task 1: hermes-memory-01-store-and-migration

**Files:**
- Create: `backend/packages/harness/nion/hermes_memory/__init__.py`
- Create: `backend/packages/harness/nion/hermes_memory/models.py`
- Create: `backend/packages/harness/nion/hermes_memory/store.py`
- Create: `backend/packages/harness/nion/hermes_memory/migration.py`
- Modify: `backend/packages/harness/nion/config/paths.py`
- Test: `backend/tests/test_hermes_memory_store.py`

**Step 1: Write the failing test**

Create `backend/tests/test_hermes_memory_store.py`:

```python
from nion.hermes_memory.migration import migrate_legacy_memory_json
from nion.hermes_memory.store import HermesMemoryStore


def test_store_loads_adds_and_renders_prompt_snapshot(tmp_path):
    store = HermesMemoryStore(memory_dir=tmp_path / "memories")

    added = store.add(
        target="memory",
        content="The repo uses uv for backend commands and pnpm for frontend commands.",
    )
    assert added["success"] is True

    user_added = store.add(
        target="user",
        content="User prefers concise Chinese responses with concrete file paths.",
    )
    assert user_added["success"] is True

    store = HermesMemoryStore(memory_dir=tmp_path / "memories")
    store.load_from_disk()
    snapshot = store.get_system_prompt_snapshot()

    assert "uv for backend commands" in snapshot["memory"]
    assert "concise Chinese responses" in snapshot["user"]


def test_store_enforces_char_limits_and_rejects_overflow(tmp_path):
    store = HermesMemoryStore(memory_dir=tmp_path / "memories", memory_char_limit=20, user_char_limit=20)

    result = store.add(target="memory", content="this line is definitely too long")

    assert result["success"] is False
    assert "exceed the limit" in result["error"]


def test_migrate_legacy_memory_json_preserves_user_context_and_facts(tmp_path):
    legacy = tmp_path / "memory.json"
    legacy.write_text(
        """{
  "version": "1.0",
  "lastUpdated": "2026-03-24T00:00:00Z",
  "user": {
    "workContext": {"summary": "Working on Nion memory migration", "updatedAt": "2026-03-24T00:00:00Z"},
    "personalContext": {"summary": "Prefers Chinese", "updatedAt": "2026-03-24T00:00:00Z"},
    "topOfMind": {"summary": "Replace the memory system", "updatedAt": "2026-03-24T00:00:00Z"}
  },
  "history": {
    "recentMonths": {"summary": "Built recall features", "updatedAt": "2026-03-24T00:00:00Z"},
    "earlierContext": {"summary": "", "updatedAt": ""},
    "longTermBackground": {"summary": "", "updatedAt": ""}
  },
  "facts": [
    {"id": "fact_1", "content": "User dislikes fluffy answers", "category": "preference", "confidence": 0.95, "createdAt": "2026-03-24T00:00:00Z", "source": "thread-1"}
  ]
}""",
        encoding="utf-8",
    )

    migrate_legacy_memory_json(
        legacy_json_path=legacy,
        memory_dir=tmp_path / "memories",
    )

    store = HermesMemoryStore(memory_dir=tmp_path / "memories")
    store.load_from_disk()

    assert any("Built recall features" in entry for entry in store.memory_entries)
    assert any("User dislikes fluffy answers" in entry for entry in store.user_entries)
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_hermes_memory_store.py -q`
Expected: `FAIL` with `ModuleNotFoundError: No module named 'nion.hermes_memory'`

**Step 3: Write minimal implementation**

Create `backend/packages/harness/nion/hermes_memory/store.py` with a Hermes-style bounded store:

```python
from __future__ import annotations

from pathlib import Path


class HermesMemoryStore:
    def __init__(self, memory_dir: Path, memory_char_limit: int = 2200, user_char_limit: int = 1375):
        self._memory_dir = Path(memory_dir)
        self.memory_char_limit = memory_char_limit
        self.user_char_limit = user_char_limit
        self.memory_entries: list[str] = []
        self.user_entries: list[str] = []
        self._snapshot = {"memory": "", "user": ""}

    def load_from_disk(self) -> None:
        ...

    def get_system_prompt_snapshot(self) -> dict[str, str]:
        return dict(self._snapshot)

    def add(self, target: str, content: str) -> dict[str, object]:
        ...

    def replace(self, target: str, old_text: str, new_content: str) -> dict[str, object]:
        ...

    def remove(self, target: str, text: str) -> dict[str, object]:
        ...

    def read(self, target: str) -> dict[str, object]:
        ...
```

Create `backend/packages/harness/nion/hermes_memory/migration.py` with a one-shot migrator:

```python
def migrate_legacy_memory_json(legacy_json_path: Path, memory_dir: Path) -> None:
    # Read the old structured file once, flatten summaries/facts into durable entries,
    # then write MEMORY.md and USER.md without preserving the old JSON schema.
    ...
```

Update `backend/packages/harness/nion/config/paths.py` to add:

```python
    @property
    def hermes_memory_dir(self) -> Path:
        return self.base_dir / "memories"

    @property
    def hermes_memory_file(self) -> Path:
        return self.hermes_memory_dir / "MEMORY.md"

    @property
    def hermes_user_file(self) -> Path:
        return self.hermes_memory_dir / "USER.md"
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_hermes_memory_store.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/hermes-memory-01.commit <<'EOF'
Introduce Hermes-style file-backed memory storage and legacy migration

Constraint: Existing user memory data must survive the storage swap
Rejected: Drop legacy memory.json without migration | silent user data loss
Confidence: high
Scope-risk: moderate
Directive: Keep transcript recall separate from long-term curated memory
Tested: uv run pytest tests/test_hermes_memory_store.py -q
EOF
git add backend/packages/harness/nion/hermes_memory backend/packages/harness/nion/config/paths.py backend/tests/test_hermes_memory_store.py
git commit -F /tmp/hermes-memory-01.commit
```

### Task 2: hermes-memory-02-tool-contract

**Files:**
- Create: `backend/packages/harness/nion/tools/builtins/memory_tool.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Test: `backend/tests/test_memory_tool.py`

**Step 1: Write the failing test**

Create `backend/tests/test_memory_tool.py`:

```python
from nion.tools.builtins.memory_tool import memory_tool


def test_memory_tool_reads_and_mutates_curated_memory(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    add_result = memory_tool(action="add", target="user", content="User prefers terse answers.")
    assert "Entry added" in add_result

    read_result = memory_tool(action="read", target="user")
    assert "terse answers" in read_result

    replace_result = memory_tool(
        action="replace",
        target="user",
        old_text="terse",
        new_content="User prefers terse Chinese answers.",
    )
    assert "Entry replaced" in replace_result
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_memory_tool.py -q`
Expected: `FAIL` with `ModuleNotFoundError` or missing `memory` tool symbol

**Step 3: Write minimal implementation**

Create `backend/packages/harness/nion/tools/builtins/memory_tool.py`:

```python
from typing import Literal

from langchain.tools import tool

from nion.config.paths import get_paths
from nion.hermes_memory.store import HermesMemoryStore


@tool("memory", parse_docstring=True)
def memory_tool(
    action: Literal["add", "replace", "remove", "read"],
    target: Literal["memory", "user"],
    content: str | None = None,
    old_text: str | None = None,
) -> str:
    """Read or mutate durable long-term memory entries."""
    store = HermesMemoryStore(memory_dir=get_paths().hermes_memory_dir)
    store.load_from_disk()
    ...
```

Update `backend/packages/harness/nion/tools/builtins/__init__.py` and `backend/packages/harness/nion/tools/tools.py` so the new builtin is always available alongside `present_file_tool` and `ask_clarification_tool`.

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_memory_tool.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/hermes-memory-02.commit <<'EOF'
Expose Hermes-style curated memory through an explicit tool contract

Constraint: Hermes memory is tool-driven, not background-summarized
Rejected: Keep hidden background memory writes | incompatible with Hermes behavior
Confidence: high
Scope-risk: narrow
Directive: Long-term memory writes must remain explicit and inspectable
Tested: uv run pytest tests/test_memory_tool.py -q
EOF
git add backend/packages/harness/nion/tools/builtins/memory_tool.py backend/packages/harness/nion/tools/builtins/__init__.py backend/packages/harness/nion/tools/tools.py backend/tests/test_memory_tool.py
git commit -F /tmp/hermes-memory-02.commit
```

### Task 3: hermes-memory-03-prompt-and-runtime

**Files:**
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Delete: `backend/packages/harness/nion/agents/middlewares/memory_middleware.py`
- Delete: `backend/packages/harness/nion/agents/memory/__init__.py`
- Delete: `backend/packages/harness/nion/agents/memory/prompt.py`
- Delete: `backend/packages/harness/nion/agents/memory/queue.py`
- Delete: `backend/packages/harness/nion/agents/memory/updater.py`
- Test: `backend/tests/test_hermes_memory_prompt.py`
- Test: `backend/tests/test_recall_capture_middleware.py`

**Step 1: Write the failing test**

Create `backend/tests/test_hermes_memory_prompt.py`:

```python
from nion.agents.lead_agent.agent import _build_middlewares
from nion.agents.lead_agent.prompt import _get_memory_context


def test_prompt_uses_frozen_hermes_memory_snapshot(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    (tmp_path / "memories").mkdir(parents=True)
    (tmp_path / "memories" / "MEMORY.md").write_text("§\nUse uv in backend worktrees.\n", encoding="utf-8")
    (tmp_path / "memories" / "USER.md").write_text("§\nUser prefers Chinese replies.\n", encoding="utf-8")

    content = _get_memory_context()

    assert "<memory>" in content
    assert "Use uv in backend worktrees." in content
    assert "User prefers Chinese replies." in content


def test_lead_agent_no_longer_registers_memory_middleware():
    middlewares = _build_middlewares(config={"configurable": {}}, model_name=None)
    assert all(m.__class__.__name__ != "MemoryMiddleware" for m in middlewares)
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_hermes_memory_prompt.py -q`
Expected: `FAIL` because `_get_memory_context()` still reads structured memory and `_build_middlewares()` still appends `MemoryMiddleware`

**Step 3: Write minimal implementation**

Change `backend/packages/harness/nion/agents/lead_agent/prompt.py`:

```python
from nion.hermes_memory.store import HermesMemoryStore


def _get_memory_context(agent_name: str | None = None) -> str:
    store = HermesMemoryStore(memory_dir=get_paths().hermes_memory_dir)
    store.load_from_disk()
    snapshot = store.get_system_prompt_snapshot()
    sections = [snapshot["memory"], snapshot["user"]]
    memory_content = "\n".join(part for part in sections if part.strip())
    if not memory_content:
        return ""
    return f"<memory>\n{memory_content}\n</memory>\n"
```

Change `backend/packages/harness/nion/agents/lead_agent/agent.py` to remove `MemoryMiddleware(...)` from `_build_middlewares()` and keep `RecallCaptureMiddleware` plus `ContinuityMiddleware`.

Delete the old structured-memory modules once tests are green and no import sites remain.

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_hermes_memory_prompt.py tests/test_recall_capture_middleware.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/hermes-memory-03.commit <<'EOF'
Replace background memory injection with Hermes-style frozen prompt snapshots

Constraint: The system prompt must stop depending on structured memory.json updates
Rejected: Keep MemoryMiddleware as a no-op shim | dead code and misleading behavior
Confidence: high
Scope-risk: broad
Directive: Do not reintroduce hidden background long-term memory writes without a product decision
Tested: uv run pytest tests/test_hermes_memory_prompt.py tests/test_recall_capture_middleware.py -q
EOF
git add backend/packages/harness/nion/agents/lead_agent/prompt.py backend/packages/harness/nion/agents/lead_agent/agent.py backend/tests/test_hermes_memory_prompt.py backend/tests/test_recall_capture_middleware.py
git rm backend/packages/harness/nion/agents/middlewares/memory_middleware.py backend/packages/harness/nion/agents/memory/__init__.py backend/packages/harness/nion/agents/memory/prompt.py backend/packages/harness/nion/agents/memory/queue.py backend/packages/harness/nion/agents/memory/updater.py
git commit -F /tmp/hermes-memory-03.commit
```

### Task 4: hermes-memory-04-api-client-and-channel-compat

**Files:**
- Modify: `backend/app/gateway/routers/memory.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/app/channels/manager.py`
- Test: `backend/tests/test_memory_router.py`
- Test: `backend/tests/test_client.py`

**Step 1: Write the failing test**

Create `backend/tests/test_memory_router.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_memory_router_returns_hermes_backed_payload(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    memories = tmp_path / "memories"
    memories.mkdir(parents=True)
    (memories / "MEMORY.md").write_text("§\nUse uv in backend worktrees.\n", encoding="utf-8")
    (memories / "USER.md").write_text("§\nUser prefers terse Chinese replies.\n", encoding="utf-8")

    client = TestClient(create_app())
    response = client.get("/api/memory")

    assert response.status_code == 200
    data = response.json()
    assert data["memoryEntries"] == ["Use uv in backend worktrees."]
    assert data["userEntries"] == ["User prefers terse Chinese replies."]
    assert "snapshot" in data
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_memory_router.py -q`
Expected: `FAIL` because `/api/memory` still returns the legacy structured schema

**Step 3: Write minimal implementation**

Update `backend/app/gateway/routers/memory.py` to return a Hermes-backed model:

```python
class HermesMemoryResponse(BaseModel):
    lastUpdated: str
    memoryEntries: list[str]
    userEntries: list[str]
    snapshot: dict[str, str]
    limits: dict[str, int]
    storage: dict[str, str]
```

Update `backend/packages/harness/nion/client.py` so:

```python
    def get_memory(self) -> dict:
        store = HermesMemoryStore(memory_dir=get_paths().hermes_memory_dir)
        store.load_from_disk()
        return store.export_api_payload()
```

Update `backend/app/channels/manager.py` `/memory` handling to render the new payload without assuming the old nested JSON layout.

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_memory_router.py tests/test_client.py -q`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/hermes-memory-04.commit <<'EOF'
Retarget memory APIs and internal clients to Hermes-backed payloads

Constraint: /api/memory must keep working for in-repo consumers during the migration
Rejected: Ship a second route and leave old callers untouched | doubles support burden
Confidence: medium
Scope-risk: moderate
Directive: Keep the API surface explicit about curated memory vs transcript recall
Tested: uv run pytest tests/test_memory_router.py tests/test_client.py -q
EOF
git add backend/app/gateway/routers/memory.py backend/packages/harness/nion/client.py backend/app/channels/manager.py backend/tests/test_memory_router.py backend/tests/test_client.py
git commit -F /tmp/hermes-memory-04.commit
```

### Task 5: hermes-memory-05-frontend-surface

**Files:**
- Modify: `frontend/src/core/memory/types.ts`
- Modify: `frontend/src/core/memory/api.ts`
- Modify: `frontend/src/core/memory/hooks.ts`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Verify: `frontend/package.json`

**Step 1: Write the failing type-level expectation**

Update `frontend/src/core/memory/types.ts` first so it expects the new payload:

```ts
export interface HermesMemoryPayload {
  lastUpdated: string;
  memoryEntries: string[];
  userEntries: string[];
  snapshot: {
    memory: string;
    user: string;
  };
  limits: {
    memoryChars: number;
    userChars: number;
  };
  storage: {
    memoryPath: string;
    userPath: string;
  };
}
```

**Step 2: Run typecheck to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm typecheck`
Expected: `FAIL` because `memory-settings-page.tsx` still assumes `user/history/facts`

**Step 3: Write minimal implementation**

Update `frontend/src/components/workspace/settings/memory-settings-page.tsx` so the page renders:

```tsx
## Curated Memory
- entry 1
- entry 2

## User Profile
- entry 1
- entry 2

## Prompt Snapshot
<render snapshot.memory and snapshot.user as markdown blocks>
```

Keep the existing recall search section below the long-term memory panel, but rewrite labels and empty states to reflect Hermes-style curated memory instead of structured facts/history.

Update `frontend/src/core/memory/api.ts`:

```ts
import type { HermesMemoryPayload } from "./types";

export async function loadMemory() {
  const response = await fetch(`${getBackendBaseURL()}/api/memory`);
  return (await response.json()) as HermesMemoryPayload;
}
```

**Step 4: Run frontend verification**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm check`
Expected: `PASS`

**Step 5: Commit**

```bash
cat >/tmp/hermes-memory-05.commit <<'EOF'
Rewrite the settings memory surface around Hermes-style curated entries

Constraint: The frontend must stop assuming structured history/fact sections
Rejected: Keep the old UI and fake legacy fields | misleading product surface
Confidence: medium
Scope-risk: moderate
Directive: Long-term memory UI should stay separate from transcript recall UI
Tested: cd frontend && pnpm check
EOF
git add frontend/src/core/memory/types.ts frontend/src/core/memory/api.ts frontend/src/core/memory/hooks.ts frontend/src/components/workspace/settings/memory-settings-page.tsx frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts
git commit -F /tmp/hermes-memory-05.commit
```

### Task 6: hermes-memory-06-config-docs-and-final-cleanup

**Files:**
- Modify: `backend/packages/harness/nion/config/memory_config.py`
- Modify: `config.example.yaml`
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `backend/docs/MEMORY_IMPROVEMENTS.md`
- Modify: `backend/docs/MEMORY_IMPROVEMENTS_SUMMARY.md`
- Delete: `backend/tests/test_memory_updater.py`
- Delete: `backend/tests/test_memory_prompt_injection.py`
- Delete: `backend/tests/test_memory_upload_filtering.py`
- Verify: `backend/pyproject.toml`
- Verify: `frontend/package.json`

**Step 1: Write the failing doc/config expectation**

Add a checklist comment to the PR branch or working notes:

```text
- No documentation may still describe debounce queue + fact confidence trimming + memory.json summaries as the active long-term memory system.
- No config surface may still expose options that only belonged to the deleted updater pipeline.
```

**Step 2: Run grep to verify stale references still exist**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion && rg -n "debounce_seconds|max_facts|fact_confidence_threshold|max_injection_tokens|memory.json|MemoryUpdater|MemoryMiddleware" README.md backend config.example.yaml`
Expected: `MATCHES FOUND`

**Step 3: Write minimal implementation**

Reduce `backend/packages/harness/nion/config/memory_config.py` to Hermes-style knobs only, for example:

```python
class MemoryConfig(BaseModel):
    enabled: bool = True
    memory_char_limit: int = 2200
    user_char_limit: int = 1375
    auto_migrate_legacy_json: bool = True
```

Update `config.example.yaml`:

```yaml
memory:
  enabled: true
  memory_char_limit: 2200
  user_char_limit: 1375
  auto_migrate_legacy_json: true
```

Rewrite docs so they describe:
- explicit `memory` tool writes
- `MEMORY.md` and `USER.md`
- recall as separate transcript search
- migration behavior for old `memory.json`

Delete the old structured-memory tests once replacement coverage exists.

**Step 4: Run final verification**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_hermes_memory_store.py tests/test_memory_tool.py tests/test_hermes_memory_prompt.py tests/test_memory_router.py tests/test_client.py tests/test_recall_capture_middleware.py tests/test_recall_router.py -q`
Expected: `PASS`

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm check`
Expected: `PASS`

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion && rg -n "MemoryUpdater|MemoryMiddleware|debounce_seconds|max_facts|fact_confidence_threshold|max_injection_tokens" README.md backend config.example.yaml`
Expected: no matches for active-code/docs paths that describe the current system

**Step 5: Commit**

```bash
cat >/tmp/hermes-memory-06.commit <<'EOF'
Remove the old structured memory contract and document the Hermes replacement

Constraint: The repo must describe exactly one long-term memory architecture after the migration
Rejected: Leave stale structured-memory docs in place | guarantees future regressions
Confidence: medium
Scope-risk: moderate
Directive: Treat exact Hermes state.db parity as a separate project from this long-term memory swap
Tested: uv run pytest tests/test_hermes_memory_store.py tests/test_memory_tool.py tests/test_hermes_memory_prompt.py tests/test_memory_router.py tests/test_client.py tests/test_recall_capture_middleware.py tests/test_recall_router.py -q; cd frontend && pnpm check
EOF
git add backend/packages/harness/nion/config/memory_config.py config.example.yaml README.md backend/README.md backend/CLAUDE.md backend/docs/MEMORY_IMPROVEMENTS.md backend/docs/MEMORY_IMPROVEMENTS_SUMMARY.md
git rm backend/tests/test_memory_updater.py backend/tests/test_memory_prompt_injection.py backend/tests/test_memory_upload_filtering.py
git commit -F /tmp/hermes-memory-06.commit
```

### Task 7: hermes-memory-07-post-migration-manual-check

**Files:**
- Verify only: `/Users/zhangtiancheng/.nion-data/memories/MEMORY.md`
- Verify only: `/Users/zhangtiancheng/.nion-data/memories/USER.md`
- Verify only: `/Users/zhangtiancheng/.nion-data/recall.sqlite3`

**Step 1: Seed a realistic manual scenario**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run python - <<'PY'
from nion.hermes_memory.store import HermesMemoryStore
from nion.config.paths import get_paths

store = HermesMemoryStore(memory_dir=get_paths().hermes_memory_dir)
store.load_from_disk()
print(store.add(target="memory", content="Use uv run pytest inside backend/ for backend verification."))
print(store.add(target="user", content="User prefers Chinese answers with direct conclusions first."))
PY
```

**Step 2: Manually verify prompt payload and API output**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run python - <<'PY'
from nion.agents.lead_agent.prompt import _get_memory_context
print(_get_memory_context())
PY
curl -s http://localhost:2026/api/memory
```

Expected:
- `<memory>` contains curated entries from both files
- `/api/memory` returns `memoryEntries`, `userEntries`, and `snapshot`
- recall search remains independent through `/api/recall/search`

**Step 3: Commit**

```bash
cat >/tmp/hermes-memory-07.commit <<'EOF'
Validate Hermes memory replacement against the live runtime surfaces

Constraint: Manual smoke checks must prove prompt injection and API output agree
Rejected: Rely on unit tests alone | misses runtime wiring regressions
Confidence: medium
Scope-risk: narrow
Directive: Keep manual smoke steps available for future storage migrations
Tested: uv run python prompt smoke; curl /api/memory
EOF
git add -A
git commit -F /tmp/hermes-memory-07.commit
```
