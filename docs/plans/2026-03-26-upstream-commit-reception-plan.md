# Upstream Commit Reception Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Absorb the high-value upstream `bytedance/deer-flow` commits into the `electron` branch without regressing Nion branding, Electron/daemon runtime behavior, or Config Center / SQLite ownership of user settings.

**Architecture:** Execute the reception in an isolated worktree and process upstream commits in four lanes: runtime hardening, desktop UI correctness, Nion-owned thread/token UX, and optional shared-module extraction. Treat the current Nion thread API, daemon route surface, Config Center store, and shared renderer file layout as the source of truth; upstream fixes are accepted only when they fit those boundaries or can be rewritten to fit them.

**Tech Stack:** Python 3.12, FastAPI, LangGraph/LangChain, TypeScript, React 19, Next.js shared renderer, Electron, Config Center / SQLite, `pytest`, `node --test`, `pnpm`, `uv`

---

## Acceptance Contract

- Keep `Nion` as the only user-facing product brand.
- Keep Electron + local daemon as the shipped runtime model.
- Keep Config Center / SQLite as the public configuration owner.
- Do not revive `config.yaml` or `scripts/serve.sh` as runtime control surfaces for new behavior.
- Prefer direct backports for isolated runtime fixes.
- Prefer Nion-specific rewrites when upstream assumes LangGraph web-only APIs or browser-first flows.
- Treat docs-only, CI-only, translation-only, and pure dependency bumps as explicitly skipped unless they become prerequisites for a code fix.

## Commit Intake Matrix

### Lane 1: Direct Backports

- `a9940c39` `fix(mcp): implement sync invocation wrapper for async MCP tools`
- `77b8ef79` `fix(middleware): use HumanMessage in LoopDetectionMiddleware for Anthropic compat`
- `2eca58bd` `fix: add null checks for runtime.context in middlewares and tools`
- `6bf52674` `fix(skills): follow symlinks when scanning custom skills directory`
- `0431a67b` `fix(frontend): filter task tool calls when rendering SubtaskCard`
- `adc51e54` `fix(frontend): add stable ids for chat resizable panels`

### Lane 2: Nion-Specific Rewrites

- `8b0f3fe2` `fix(threads): clean up local thread data after thread deletion`
- `b40b05f6` `feat(frontend): display token usage per conversation turn`
- `48a19755` `fix(frontend): fix the build error of i18n`

### Lane 3: Optional Shared-Module Extractions

- `b8bc80d8` `refactor: extract shared skill installer and upload manager to harness`

### Lane 4: Evaluate But Do Not Blindly Port

- `d7e51076` `fix: add null checks for runtime.context and tighten langgraph constraint`
- `16ed797e` `feat: add configurable log level and token usage tracking`
- `fdfe08d4` `Add user configuration template for China region`

### Explicit Skips For This Reception Plan

- `79acc393` `fix: add error handling for podcast generation failures`
- `14a3fa52` `fix: use subprocess instead of os.system in analyze.py`
- `d0049ad9` `chron(ci): setup the lint check in frontend`
- `c5ddc6a1` `build(deps): bump h3 from 1.15.5 to 1.15.10 in /frontend`
- `4b15f146` `fix: repair frontend check command and docs`
- `067b19af` `fix: add Windows compatibility for make dev/start commands`
- `21febe1c` `docs: add French translation of README`
- `f499f37e` `docs: add Russian README translation`
- `97ad67db` `docs: fix typo and grammar issues in docs`
- `12875664` `docs: add domestic link of coding plan`
- `afe325d3` `Fix command syntax for container image pull`
- `afb0f66c`, `ec46ae07`, `1f0ae64e`, `ac97dc6d` are upstream test-only commits; this plan replaces them with Nion-local regression tests tied to each accepted behavior change.

## Execution Setup

Run the implementation in a new worktree before Task 1:

```bash
git fetch origin --prune
git worktree list
test -d .worktrees/codex-upstream-reception || \
  git worktree add .worktrees/codex-upstream-reception -b codex/upstream-reception
cd .worktrees/codex-upstream-reception
git status --short --branch
git log --oneline $(git merge-base HEAD origin/main)..origin/main
```

Expected:

- Worktree branch is `codex/upstream-reception`
- The worktree is clean before edits
- The upstream-only commits still include the hashes listed in the intake matrix

## Execution Order

1. Finish Lane 1 completely and keep it green.
2. Land Lane 2 only after Lane 1 verification passes.
3. Land Lane 3 only if Lanes 1-2 are clean and still reviewable.
4. Keep Lane 4 decisions explicit; do not smuggle them into other commits.

### Task 1: Async MCP Sync Wrapper (Upstream `a9940c39`)

**Files:**
- Modify: `backend/packages/harness/nion/mcp/tools.py`
- Create: `backend/tests/test_mcp_sync_wrapper.py`
- Reference: `backend/tests/test_subagent_executor.py`

**Step 1: Write the failing test**

```python
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from nion.mcp.tools import get_mcp_tools


class MockArgs(BaseModel):
    x: int = Field(...)


def test_async_only_mcp_tool_gets_sync_wrapper():
    async def mock_coro(x: int):
        return f"result:{x}"

    mock_tool = StructuredTool(
        name="demo",
        description="demo",
        args_schema=MockArgs,
        func=None,
        coroutine=mock_coro,
    )

    mock_client = MagicMock()
    mock_client.get_tools = AsyncMock(return_value=[mock_tool])

    with (
        patch("langchain_mcp_adapters.client.MultiServerMCPClient", return_value=mock_client),
        patch("nion.config.extensions_config.ExtensionsConfig.from_file"),
        patch("nion.mcp.tools.build_servers_config", return_value={"demo": {}}),
        patch("nion.mcp.tools.get_initial_oauth_headers", new_callable=AsyncMock, return_value={}),
    ):
        tools = asyncio.run(get_mcp_tools())

    assert tools[0].func is not None
    assert tools[0].func(x=7) == "result:7"
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_mcp_sync_wrapper.py -q
```

Expected: FAIL because `_make_sync_tool_wrapper` does not exist and async-only MCP tools are still returned without a sync `func`.

**Step 3: Write minimal implementation**

```python
import asyncio
import atexit
import concurrent.futures
from collections.abc import Callable
from typing import Any

_SYNC_TOOL_EXECUTOR = concurrent.futures.ThreadPoolExecutor(
    max_workers=10,
    thread_name_prefix="mcp-sync-tool",
)
atexit.register(lambda: _SYNC_TOOL_EXECUTOR.shutdown(wait=False))


def _make_sync_tool_wrapper(coro: Callable[..., Any], tool_name: str) -> Callable[..., Any]:
    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop is not None and loop.is_running():
            future = _SYNC_TOOL_EXECUTOR.submit(asyncio.run, coro(*args, **kwargs))
            return future.result()
        return asyncio.run(coro(*args, **kwargs))

    return sync_wrapper


for tool in tools:
    if getattr(tool, "func", None) is None and getattr(tool, "coroutine", None) is not None:
        tool.func = _make_sync_tool_wrapper(tool.coroutine, tool.name)
```

**Step 4: Run tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_mcp_sync_wrapper.py backend/tests/test_subagent_executor.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/mcp/tools.py backend/tests/test_mcp_sync_wrapper.py
git commit -F- <<'EOF'
Make async-only MCP tools callable from sync execution paths

Backport the upstream MCP sync-wrapper fix into Nion without changing
Config Center ownership or MCP configuration surfaces. This only patches
tool invocation so desktop/runtime sync consumers can execute async-only
MCP tools safely.

Constraint: Must keep Config Center / extensions config ownership unchanged
Rejected: Rewriting every sync execution path to async-only | too broad for this reception lane
Confidence: high
Scope-risk: narrow
Directive: Remove this wrapper only after every sync MCP consumer is gone
Tested: uv run pytest backend/tests/test_mcp_sync_wrapper.py backend/tests/test_subagent_executor.py -q
Not-tested: Live MCP OAuth flows against external servers
EOF
```

### Task 2: Anthropic-Safe Loop Detection (Upstream `77b8ef79`)

**Files:**
- Modify: `backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py`
- Modify: `backend/tests/test_loop_detection_middleware.py`

**Step 1: Write the failing test**

```python
from langchain_core.messages import HumanMessage


def test_warn_at_threshold_uses_human_message():
    mw = LoopDetectionMiddleware(warn_threshold=3, hard_limit=5)
    runtime = _make_runtime()
    call = [_bash_call("ls")]

    for _ in range(2):
        mw._apply(_make_state(tool_calls=call), runtime)

    result = mw._apply(_make_state(tool_calls=call), runtime)
    assert isinstance(result["messages"][0], HumanMessage)
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_loop_detection_middleware.py -q
```

Expected: FAIL because the middleware still injects `SystemMessage`.

**Step 3: Write minimal implementation**

```python
from langchain_core.messages import HumanMessage


if warning:
    return {"messages": [HumanMessage(content=warning)]}
```

**Step 4: Run tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_loop_detection_middleware.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py backend/tests/test_loop_detection_middleware.py
git commit -F- <<'EOF'
Keep loop detection warnings compatible with Anthropic-style message rules

Backport the upstream loop-detection fix so Nion no longer injects
mid-conversation system messages that Anthropic-compatible providers
reject.

Constraint: Must preserve existing loop-stop behavior and warning text
Rejected: Disabling loop warnings for Anthropic only | special casing would drift from other providers
Confidence: high
Scope-risk: narrow
Directive: Do not switch this warning back to SystemMessage without provider-wide validation
Tested: uv run pytest backend/tests/test_loop_detection_middleware.py -q
Not-tested: Full end-to-end run against live Anthropic credentials
EOF
```

### Task 3: Runtime Context Guard Sweep (Upstream `2eca58bd`, Nion-Expanded)

**Files:**
- Modify: `backend/packages/harness/nion/agents/middlewares/memory_middleware.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py`
- Modify: `backend/packages/harness/nion/sandbox/middleware.py`
- Modify: `backend/packages/harness/nion/sandbox/tools.py`
- Modify: `backend/packages/harness/nion/tools/builtins/present_file_tool.py`
- Modify: `backend/packages/harness/nion/tools/builtins/setup_agent_tool.py`
- Modify: `backend/packages/harness/nion/tools/builtins/task_tool.py`
- Modify: `backend/packages/harness/nion/tools/builtins/automation_tool.py`
- Create: `backend/tests/test_runtime_context_guards.py`

**Step 1: Write the failing test**

```python
from unittest.mock import MagicMock

from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.middlewares.memory_middleware import MemoryMiddleware
from nion.agents.middlewares.recall_capture_middleware import RecallCaptureMiddleware
from nion.tools.builtins.automation_tool import get_automation_tool_service


def test_memory_middleware_skips_when_runtime_context_is_none():
    middleware = MemoryMiddleware(agent_name="lead_agent")
    runtime = MagicMock()
    runtime.context = None
    state = {"messages": [HumanMessage(content="hi"), AIMessage(content="hello")]}
    assert middleware.after_agent(state, runtime) is None


def test_recall_capture_skips_when_runtime_context_is_none():
    middleware = RecallCaptureMiddleware(agent_name="lead_agent")
    runtime = MagicMock()
    runtime.context = None
    assert middleware.after_agent({"messages": []}, runtime) is None


def test_automation_service_falls_back_without_runtime_context():
    runtime = MagicMock()
    runtime.context = None
    assert get_automation_tool_service(runtime) is not None
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_runtime_context_guards.py -q
```

Expected: FAIL because several code paths still unconditionally read `runtime.context.get(...)`.

**Step 3: Write minimal implementation**

```python
thread_id = runtime.context.get("thread_id") if runtime.context else None
agent_name = runtime.context.get("agent_name") if runtime.context else None
service = runtime.context.get("automation_tool_service") if runtime and runtime.context else None

if runtime.context is not None:
    runtime.context["sandbox_id"] = sandbox_id
```

Notes:

- Sweep every current `runtime.context.get(...)` site in the Nion tree, not just the upstream files.
- Do not carry the upstream `langgraph<1.0.10` pin in this task. Only revisit [backend/packages/harness/pyproject.toml](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/pyproject.toml) if a reproducible post-guard failure still exists.

**Step 4: Run tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_runtime_context_guards.py backend/tests/test_loop_detection_middleware.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/agents/middlewares/memory_middleware.py \
  backend/packages/harness/nion/agents/middlewares/uploads_middleware.py \
  backend/packages/harness/nion/agents/middlewares/continuity_middleware.py \
  backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py \
  backend/packages/harness/nion/sandbox/middleware.py \
  backend/packages/harness/nion/sandbox/tools.py \
  backend/packages/harness/nion/tools/builtins/present_file_tool.py \
  backend/packages/harness/nion/tools/builtins/setup_agent_tool.py \
  backend/packages/harness/nion/tools/builtins/task_tool.py \
  backend/packages/harness/nion/tools/builtins/automation_tool.py \
  backend/tests/test_runtime_context_guards.py
git commit -F- <<'EOF'
Harden middleware and tool surfaces against missing runtime context

Expand the upstream runtime-context guard fix across the Nion-specific
middleware and tool surfaces that were added after the upstream split.
This keeps degraded runtime paths from crashing the desktop product.

Constraint: Missing runtime context must degrade gracefully instead of inventing fake request metadata
Rejected: Catch-all try/except wrappers around each method | would hide real bugs and lose intent
Confidence: medium
Scope-risk: moderate
Directive: Any new runtime.context access must have a None-path from the start
Tested: uv run pytest backend/tests/test_runtime_context_guards.py backend/tests/test_loop_detection_middleware.py -q
Not-tested: Every tool path under a live runtime without context
EOF
```

### Task 4: Follow Symlinks In Custom Skills Discovery (Upstream `6bf52674`)

**Files:**
- Modify: `backend/packages/harness/nion/skills/loader.py`
- Modify: `backend/tests/test_skills_loader.py`

**Step 1: Write the failing test**

```python
import pytest
from pathlib import Path

from nion.skills.loader import load_skills


def test_load_skills_descends_into_symlinked_custom_skill(tmp_path: Path):
    skills_root = tmp_path / "skills"
    external_skill = tmp_path / "external" / "linked-skill"
    _write_skill(external_skill, "linked-skill", "Linked skill")

    link_parent = skills_root / "custom"
    link_parent.mkdir(parents=True, exist_ok=True)
    symlink_path = link_parent / "linked-skill"

    try:
        symlink_path.symlink_to(external_skill, target_is_directory=True)
    except OSError:
        pytest.skip("symlink support is unavailable on this platform")

    skills = load_skills(skills_path=skills_root, use_config=False, enabled_only=False)
    assert "linked-skill" in {skill.name for skill in skills}
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_skills_loader.py -q
```

Expected: FAIL because `os.walk()` does not descend into symlinked directories yet.

**Step 3: Write minimal implementation**

```python
for current_root, dir_names, file_names in os.walk(category_path, followlinks=True):
    dir_names[:] = sorted(name for name in dir_names if not name.startswith("."))
```

**Step 4: Run tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_skills_loader.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/skills/loader.py backend/tests/test_skills_loader.py
git commit -F- <<'EOF'
Load symlinked custom skills during recursive discovery

Backport the upstream symlink traversal fix so custom skills linked in
from external repositories are discovered by Nion's existing loader.

Constraint: Hidden directories must still stay excluded
Rejected: Resolving symlinks manually before walking | more code for the same traversal behavior
Confidence: high
Scope-risk: narrow
Directive: Keep skill discovery deterministic even when followlinks is enabled
Tested: uv run pytest backend/tests/test_skills_loader.py -q
Not-tested: Very large symlinked skill trees
EOF
```

### Task 5: Stable Chat Panel IDs (Upstream `adc51e54`)

**Files:**
- Create: `frontend/src/components/workspace/chats/panel-ids.ts`
- Create: `frontend/src/components/workspace/chats/panel-ids.test.ts`
- Modify: `frontend/src/components/workspace/chats/chat-box.tsx`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildChatPanelIds } from "./panel-ids.ts";

void test("buildChatPanelIds derives stable ids from pathname", () => {
  assert.deepEqual(buildChatPanelIds("/workspace/chats/thread-1"), {
    groupId: "workspace-chats-thread-1-panels",
    separatorId: "workspace-chats-thread-1-separator",
  });
});

void test("buildChatPanelIds falls back for empty pathname", () => {
  assert.deepEqual(buildChatPanelIds(""), {
    groupId: "workspace-panels",
    separatorId: "workspace-separator",
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C frontend exec node --test src/components/workspace/chats/panel-ids.test.ts
```

Expected: FAIL because the helper file does not exist.

**Step 3: Write minimal implementation**

```ts
export function buildChatPanelIds(pathname: string) {
  const base =
    pathname
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace";

  return {
    groupId: `${base}-panels`,
    separatorId: `${base}-separator`,
  };
}
```

Then update `chat-box.tsx` to call the helper with `usePathname()` and wire the returned ids into `ResizablePanelGroup` and `ResizableHandle`.

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm -C frontend exec node --test src/components/workspace/chats/panel-ids.test.ts
pnpm -C frontend exec tsc --noEmit
```

Expected: PASS.

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/chats/panel-ids.ts \
  frontend/src/components/workspace/chats/panel-ids.test.ts \
  frontend/src/components/workspace/chats/chat-box.tsx
git commit -F- <<'EOF'
Give chat resizable panels stable ids derived from the current route

Port the upstream panel-id fix in a testable Nion form so desktop chat
surfaces keep deterministic panel ids without hiding the normalization
logic inside the component body.

Constraint: IDs must stay stable across rerenders for the same route
Rejected: Inlining pathname normalization directly in the JSX tree | harder to test and review
Confidence: high
Scope-risk: narrow
Directive: Keep future panel-id schemes route-derived and deterministic
Tested: pnpm -C frontend exec node --test src/components/workspace/chats/panel-ids.test.ts; pnpm -C frontend exec tsc --noEmit
Not-tested: Persisted panel state inside a live Electron session
EOF
```

### Task 6: Filter Only Task Tool Calls In Subtask Rendering (Upstream `0431a67b`)

**Files:**
- Create: `frontend/src/core/messages/tool-calls.ts`
- Create: `frontend/src/core/messages/tool-calls.test.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { getTaskToolCallIds } from "./tool-calls.ts";

test("returns only task tool call ids", () => {
  const ids = getTaskToolCallIds([
    { name: "bash", id: "bash-1" },
    { name: "task", id: "task-1" },
    { name: "task", id: "task-2" },
  ]);

  assert.deepEqual(ids, ["task-1", "task-2"]);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C frontend exec node --test src/core/messages/tool-calls.test.ts
```

Expected: FAIL because the helper file does not exist.

**Step 3: Write minimal implementation**

```ts
export function getTaskToolCallIds(
  toolCalls: Array<{ name?: string; id?: string | null }> | undefined,
): string[] {
  return (toolCalls ?? [])
    .filter((toolCall) => toolCall.name === "task" && Boolean(toolCall.id))
    .map((toolCall) => toolCall.id as string);
}
```

Then replace:

```ts
const taskIds = message.tool_calls?.map((toolCall) => toolCall.id);
```

with:

```ts
const taskIds = getTaskToolCallIds(message.tool_calls);
```

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm -C frontend exec node --test src/core/messages/tool-calls.test.ts
pnpm -C frontend exec tsc --noEmit
```

Expected: PASS.

**Step 5: Commit**

```bash
git add \
  frontend/src/core/messages/tool-calls.ts \
  frontend/src/core/messages/tool-calls.test.ts \
  frontend/src/components/workspace/messages/message-list.tsx
git commit -F- <<'EOF'
Render subtasks only for task tool calls

Backport the upstream SubtaskCard fix in a testable Nion form so only
task tool calls render as subtasks. This avoids crashes when unrelated
tool calls appear in the same AI message.

Constraint: Keep the UI behavior identical for real task tool calls
Rejected: Inline filter with no test seam | harder to keep regression coverage in this repo
Confidence: high
Scope-risk: narrow
Directive: Any future UI that interprets tool_calls should classify by tool name first
Tested: pnpm -C frontend exec node --test src/core/messages/tool-calls.test.ts; pnpm -C frontend exec tsc --noEmit
Not-tested: Renderer-level visual regression in a live desktop thread
EOF
```

### Task 7: Nion-Owned Thread Deletion Cleanup (Inspired by Upstream `8b0f3fe2`)

**Files:**
- Modify: `backend/packages/harness/nion/config/paths.py`
- Modify: `backend/packages/harness/nion/threads/repository.py`
- Modify: `backend/tests/test_threads_router.py`
- Create: `frontend/src/core/threads/cache.ts`
- Create: `frontend/src/core/threads/cache.test.ts`
- Modify: `frontend/src/core/threads/hooks.ts`

**Step 1: Write the failing test**

```python
def test_delete_thread_route_removes_thread_directory(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    thread_dir = tmp_path / "threads" / "thread-1" / "user-data" / "outputs"
    thread_dir.mkdir(parents=True)
    (tmp_path / "threads" / "thread-1" / "thread.json").write_text(
        '{"thread_id":"thread-1","agent_name":"lead_agent","created_at":"2026-01-01T00:00:00+00:00","updated_at":"2026-01-01T00:00:00+00:00","values":{"title":"T","messages":[],"artifacts":[],"todos":[]},"deleted":false}',
        encoding="utf-8",
    )

    client = TestClient(create_app())
    response = client.delete("/api/threads/thread-1")

    assert response.status_code == 204
    assert not (tmp_path / "threads" / "thread-1").exists()
```

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { removeThreadFromSearchCache } from "./cache.ts";

test("removeThreadFromSearchCache tolerates undefined cache", () => {
  assert.equal(removeThreadFromSearchCache(undefined, "t-1"), undefined);
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
uv run pytest backend/tests/test_threads_router.py -q
pnpm -C frontend exec node --test src/core/threads/cache.test.ts
```

Expected:

- Backend FAIL because the delete path only tombstones metadata today
- Frontend/shared-renderer FAIL because the helper file does not exist

**Step 3: Write minimal implementation**

```python
import shutil


def delete_thread_dir(self, thread_id: str) -> None:
    thread_dir = self.thread_dir(thread_id)
    if thread_dir.exists():
        shutil.rmtree(thread_dir)
```

```python
def delete_thread(self, thread_id: str) -> None:
    self._paths.delete_thread_dir(thread_id)
```

```ts
export function removeThreadFromSearchCache(
  oldData: Array<AgentThread> | undefined,
  threadId: string,
) {
  if (oldData == null) {
    return oldData;
  }
  return oldData.filter((item) => item.thread_id !== threadId);
}
```

Then update `useDeleteThread()` to use the pure helper and invalidate the `["threads", "search"]` query on settle.

Notes:

- Do not add the upstream extra cleanup endpoint. Nion already owns thread storage behind `/api/threads/{thread_id}`.
- Do not keep soft-delete tombstones once the directory is being physically removed.

**Step 4: Run tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_threads_router.py -q
pnpm -C frontend exec node --test src/core/threads/cache.test.ts
pnpm -C frontend exec tsc --noEmit
```

Expected: PASS.

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/config/paths.py \
  backend/packages/harness/nion/threads/repository.py \
  backend/tests/test_threads_router.py \
  frontend/src/core/threads/cache.ts \
  frontend/src/core/threads/cache.test.ts \
  frontend/src/core/threads/hooks.ts
git commit -F- <<'EOF'
Delete desktop thread storage at the point Nion deletes the thread

Apply the intent of the upstream thread-cleanup fix, but keep the
storage deletion inside Nion's existing desktop thread API instead of
adding a second web-only cleanup endpoint. The renderer cache update is
also made resilient when no search data is cached.

Constraint: Desktop thread deletion should stay on the existing /api/threads/{thread_id} route
Rejected: Adding a second cleanup route after delete | redundant in Nion's storage model
Confidence: medium
Scope-risk: moderate
Directive: If soft-delete ever returns, document why full directory deletion is still safe for desktop storage
Tested: uv run pytest backend/tests/test_threads_router.py -q; pnpm -C frontend exec node --test src/core/threads/cache.test.ts; pnpm -C frontend exec tsc --noEmit
Not-tested: Delete flow exercised from a live renderer session
EOF
```

### Task 8: Add Token Usage Indicator In Both Desktop Chat Headers (Upstream `b40b05f6` + `48a19755`)

**Files:**
- Create: `frontend/src/core/messages/usage.ts`
- Create: `frontend/src/core/messages/usage.test.ts`
- Create: `frontend/src/components/workspace/token-usage-indicator.tsx`
- Modify: `frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `frontend/src/app/workspace/agents/agent-chat-page.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { accumulateUsage, formatTokenCount } from "./usage.ts";

test("accumulateUsage sums usage_metadata across ai messages", () => {
  const usage = accumulateUsage([
    { type: "ai", usage_metadata: { input_tokens: 100, output_tokens: 50, total_tokens: 150 } },
    { type: "tool" },
    { type: "ai", usage_metadata: { input_tokens: 200, output_tokens: 25, total_tokens: 225 } },
  ] as any);

  assert.deepEqual(usage, {
    inputTokens: 300,
    outputTokens: 75,
    totalTokens: 375,
  });
});

test("formatTokenCount uses compact display at 10k+", () => {
  assert.equal(formatTokenCount(12345), "12.3K");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
pnpm -C frontend exec node --test src/core/messages/usage.test.ts
```

Expected: FAIL because the helper file does not exist.

**Step 3: Write minimal implementation**

```ts
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export function accumulateUsage(messages: Message[]): TokenUsage | null {
  const cumulative = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let hasUsage = false;

  for (const message of messages) {
    if (message.type !== "ai") continue;
    const usage = (message as Record<string, unknown>).usage_metadata as
      | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
      | undefined;
    if (!usage) continue;
    hasUsage = true;
    cumulative.inputTokens += usage.input_tokens ?? 0;
    cumulative.outputTokens += usage.output_tokens ?? 0;
    cumulative.totalTokens += usage.total_tokens ?? 0;
  }

  return hasUsage ? cumulative : null;
}
```

Also:

- add `TokenUsageIndicator` to both desktop chat headers
- add the `tokenUsage` i18n block
- close the `tokenUsage` object with `},` immediately in the locale files and types to avoid the exact build regression fixed by upstream `48a19755`

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm -C frontend exec node --test src/core/messages/usage.test.ts
pnpm -C frontend check
```

Expected: PASS.

**Step 5: Commit**

```bash
git add \
  frontend/src/core/messages/usage.ts \
  frontend/src/core/messages/usage.test.ts \
  frontend/src/components/workspace/token-usage-indicator.tsx \
  frontend/src/app/workspace/chats/chat-thread-page.tsx \
  frontend/src/app/workspace/agents/agent-chat-page.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts
git commit -F- <<'EOF'
Expose per-thread token usage in the desktop chat surfaces

Backport the upstream token-usage UI to Nion's chat headers using the
usage metadata already emitted by the client stream. The locale changes
include the upstream brace fix so the shared renderer build stays healthy.

Constraint: Must rely on existing streamed usage_metadata instead of new config-backed logging flags
Rejected: Porting upstream token_usage.enabled config plumbing | conflicts with settings-first architecture
Confidence: medium
Scope-risk: moderate
Directive: Keep token usage presentation derived from stream data, not a second tracking store
Tested: pnpm -C frontend exec node --test src/core/messages/usage.test.ts; pnpm -C frontend check
Not-tested: Visual polish inside the live Electron renderer
EOF
```

### Task 9: Extract Shared Upload Manager (Upstream `b8bc80d8`, Optional Lane 3)

**Files:**
- Create: `backend/packages/harness/nion/uploads/__init__.py`
- Create: `backend/packages/harness/nion/uploads/manager.py`
- Modify: `backend/app/gateway/routers/uploads.py`
- Modify: `backend/packages/harness/nion/client.py`
- Create: `backend/tests/test_uploads_manager.py`
- Modify: `backend/tests/test_uploads_router.py`
- Modify: `backend/tests/test_client.py`

**Step 1: Write the failing test**

```python
from pathlib import Path

import pytest

from nion.uploads.manager import (
    PathTraversalError,
    delete_file_safe,
    normalize_filename,
    upload_artifact_url,
)


def test_normalize_filename_rejects_backslash():
    with pytest.raises(ValueError, match="backslash"):
        normalize_filename(r"..\\evil.txt")


def test_upload_artifact_url_percent_encodes_filename():
    assert upload_artifact_url("thread-1", "hello world?.txt").endswith(
        "/api/threads/thread-1/artifacts/mnt/user-data/uploads/hello%20world%3F.txt"
    )


def test_delete_file_safe_rejects_path_traversal(tmp_path: Path):
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()
    with pytest.raises(PathTraversalError):
        delete_file_safe(uploads_dir, "../escape.txt")
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_uploads_manager.py -q
```

Expected: FAIL because `nion.uploads.manager` does not exist yet.

**Step 3: Write minimal implementation**

```python
from urllib.parse import quote

from nion.config.paths import VIRTUAL_PATH_PREFIX, get_paths


class PathTraversalError(ValueError):
    pass


def get_uploads_dir(thread_id: str) -> Path:
    return get_paths().sandbox_uploads_dir(thread_id)


def ensure_uploads_dir(thread_id: str) -> Path:
    base = get_uploads_dir(thread_id)
    base.mkdir(parents=True, exist_ok=True)
    return base


def normalize_filename(filename: str) -> str:
    safe = Path(filename).name
    if not safe or safe in {".", ".."} or "\\" in safe:
        raise ValueError(f"Filename is unsafe: {filename!r}")
    if len(safe.encode("utf-8")) > 255:
        raise ValueError("Filename too long")
    return safe


def upload_artifact_url(thread_id: str, filename: str) -> str:
    return f"/api/threads/{thread_id}/artifacts{VIRTUAL_PATH_PREFIX}/uploads/{quote(filename, safe='')}"
```

Notes:

- Do not copy the upstream thread-id regex. Keep Nion's canonical validation in `Paths.thread_dir()`.
- Centralize URL construction; remove hard-coded `mnt/user-data/uploads` strings from the router and client.

**Step 4: Run tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_uploads_manager.py backend/tests/test_uploads_router.py backend/tests/test_client.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/uploads/__init__.py \
  backend/packages/harness/nion/uploads/manager.py \
  backend/app/gateway/routers/uploads.py \
  backend/packages/harness/nion/client.py \
  backend/tests/test_uploads_manager.py \
  backend/tests/test_uploads_router.py \
  backend/tests/test_client.py
git commit -F- <<'EOF'
Share upload validation and path logic across router and client

Rework the upstream upload-manager extraction into Nion's harness so the
gateway router and local client use one upload policy. This keeps upload
URLs, filename validation, and delete behavior consistent in the desktop
runtime.

Constraint: Must preserve existing thread-id rules and settings-owned runtime behavior
Rejected: Copying upstream regex validation verbatim | would diverge from Nion Paths validation
Confidence: medium
Scope-risk: moderate
Directive: Keep upload URL construction centralized; do not reintroduce string literals in router/client
Tested: uv run pytest backend/tests/test_uploads_manager.py backend/tests/test_uploads_router.py backend/tests/test_client.py -q
Not-tested: Very large multi-file uploads on a live desktop runtime
EOF
```

### Task 10: Extract Shared Skill Installer (Upstream `b8bc80d8`, Optional Lane 3)

**Files:**
- Create: `backend/packages/harness/nion/skills/installer.py`
- Modify: `backend/packages/harness/nion/skills/__init__.py`
- Modify: `backend/app/gateway/routers/skills.py`
- Create: `backend/tests/test_skills_installer.py`
- Modify: `backend/tests/test_skills_archive_root.py`
- Modify: `backend/tests/test_skills_router.py`

**Step 1: Write the failing test**

```python
import zipfile
from pathlib import Path

import pytest

from nion.skills.installer import SkillAlreadyExistsError, install_skill_from_archive


def test_install_skill_from_archive_rejects_unsafe_member(tmp_path: Path):
    archive = tmp_path / "bad.skill"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("../evil.txt", "x")

    with pytest.raises(ValueError, match="unsafe member path"):
        install_skill_from_archive(archive, skills_root=tmp_path / "skills")


def test_install_skill_from_archive_rejects_duplicate_name(tmp_path: Path):
    ...
    with pytest.raises(SkillAlreadyExistsError):
        install_skill_from_archive(archive, skills_root=skills_root)
```

**Step 2: Run test to verify it fails**

Run:

```bash
uv run pytest backend/tests/test_skills_installer.py -q
```

Expected: FAIL because the shared installer module does not exist.

**Step 3: Write minimal implementation**

```python
class SkillAlreadyExistsError(ValueError):
    pass


def install_skill_from_archive(zip_path: str | Path, *, skills_root: Path | None = None) -> dict:
    path = Path(zip_path)
    if not path.is_file():
        raise FileNotFoundError(f"Skill file not found: {zip_path}")
    if path.suffix != ".skill":
        raise ValueError("File must have .skill extension")

    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(path, "r") as zf:
            safe_extract_skill_archive(zf, Path(tmp))
        skill_dir = resolve_skill_dir_from_archive(Path(tmp))
        is_valid, message, skill_name = _validate_skill_frontmatter(skill_dir)
        if not is_valid:
            raise ValueError(f"Invalid skill: {message}")
```

Notes:

- Keep the installer pure. No FastAPI types in `installer.py`.
- Keep skill enable/disable ownership on Config Center / existing extensions config flow. Do not add any `config.yaml` behavior.

**Step 4: Run tests to verify they pass**

Run:

```bash
uv run pytest backend/tests/test_skills_installer.py backend/tests/test_skills_archive_root.py backend/tests/test_skills_router.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/skills/installer.py \
  backend/packages/harness/nion/skills/__init__.py \
  backend/app/gateway/routers/skills.py \
  backend/tests/test_skills_installer.py \
  backend/tests/test_skills_archive_root.py \
  backend/tests/test_skills_router.py
git commit -F- <<'EOF'
Share skill-archive installation logic without reviving config.yaml flows

Port the upstream skill-installer extraction into Nion's harness so
skill archive validation and install behavior stop living inside the
router. The router still owns HTTP mapping, while Config Center
continues to own the user-facing skill state.

Constraint: Skill enablement must remain settings-owned and must not revive config.yaml
Rejected: Copying router-specific HTTPException logic into the installer | breaks separation of concerns
Confidence: medium
Scope-risk: moderate
Directive: Keep archive validation pure and reusable from both router and client code paths
Tested: uv run pytest backend/tests/test_skills_installer.py backend/tests/test_skills_archive_root.py backend/tests/test_skills_router.py -q
Not-tested: Installing malformed archives from a live desktop UI
EOF
```

## Lane 4 Decision Rules

- `d7e51076`: only carry the dependency upper bound if a reproducible failure still exists after Task 3. If not reproduced, record the decision and skip the pin.
- `16ed797e`: do not port `log_level` or `token_usage.enabled` through `config.yaml` or `scripts/serve.sh`. If token usage telemetry is later needed, route it through the daemon/control-plane surfaces instead.
- `fdfe08d4`: mine the provider examples for future Config Center presets, but do not change `config.example.yaml` as part of this reception plan.

## Final Verification

Run the full targeted regression suite from the reception worktree:

```bash
uv run pytest \
  backend/tests/test_mcp_sync_wrapper.py \
  backend/tests/test_subagent_executor.py \
  backend/tests/test_loop_detection_middleware.py \
  backend/tests/test_runtime_context_guards.py \
  backend/tests/test_skills_loader.py \
  backend/tests/test_threads_router.py -q

pnpm -C frontend exec node --test \
  src/components/workspace/chats/panel-ids.test.ts \
  src/core/messages/tool-calls.test.ts \
  src/core/messages/usage.test.ts \
  src/core/threads/cache.test.ts

pnpm -C frontend check
```

If Lane 3 is executed, extend the backend test run with:

```bash
uv run pytest \
  backend/tests/test_uploads_manager.py \
  backend/tests/test_uploads_router.py \
  backend/tests/test_client.py \
  backend/tests/test_skills_installer.py \
  backend/tests/test_skills_archive_root.py \
  backend/tests/test_skills_router.py -q
```

Expected:

- All targeted backend tests PASS
- All shared-renderer `node --test` commands PASS
- `pnpm -C frontend check` PASS
- No user-facing `DeerFlow` strings are introduced in newly touched Nion-owned copy
