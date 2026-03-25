# Hermes Session Recall Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Hermes-style transcript recall, manual search, and thread-safe continuity summaries without replacing Nion's existing structured memory system.

**Architecture:** Introduce a new recall stack under `backend/packages/harness/nion/recall/` backed by SQLite FTS5 in `NION_HOME`. A capture middleware archives only newly completed recallable turns, keyed by message IDs when available. A continuity middleware injects an ephemeral `SystemMessage` built from thread-scoped recall results before model calls. A separate gateway router and settings-page search UI expose recall independently from long-term memory.

**Tech Stack:** FastAPI, LangGraph middleware, SQLite FTS5, React, TanStack Query, Streamdown

---

**Execution Notes**

- Use `@test-driven-development` and `@verification-before-completion`.
- Do not modify `backend/packages/harness/nion/agents/memory/*` behavior in this lane; recall remains additive.
- Keep "thread continuity" and "manual search" as separate semantics:
  - continuity is always thread-scoped and never writes back into memory
  - settings-page search is explicitly global unless a `thread_id` is provided
- Do not add `providers/*` in this lane. The only backend is the local SQLite archive.
- Assume multiple backend processes may touch the archive. Enable `WAL` and a non-zero `busy_timeout`.
- Own only the files listed below so this plan can run in parallel with `hermes-usage-insights-2`, `hermes-surface-tool-policy-3`, and `hermes-channel-ops-4`.

### Task 1: hermes-session-recall-1-local-archive

**Files:**
- Create: `backend/packages/harness/nion/recall/__init__.py`
- Create: `backend/packages/harness/nion/recall/models.py`
- Create: `backend/packages/harness/nion/recall/filtering.py`
- Create: `backend/packages/harness/nion/recall/local_archive.py`
- Modify: `backend/packages/harness/nion/config/paths.py`
- Test: `backend/tests/test_local_archive.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_local_archive.py`:

```python
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallTurn


def test_archive_appends_and_searches_globally(tmp_path):
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-123",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="human",
                content="Deploy the staging worker",
                source_message_id="h-1",
            ),
            RecallTurn(
                role="ai",
                content="We fixed staging by rotating the token.",
                source_message_id="ai-1",
            ),
        ],
    )

    results = archive.search_global("rotating token", limit=3)

    assert len(results) == 1
    assert results[0].thread_id == "thread-123"
    assert "rotating the token" in results[0].snippet


def test_search_thread_scopes_results(tmp_path):
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-a",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="Thread A rotated the staging token.",
                source_message_id="ai-a",
            )
        ],
    )
    archive.append_turns(
        thread_id="thread-b",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="Thread B rotated the production token.",
                source_message_id="ai-b",
            )
        ],
    )

    results = archive.search_thread("thread-a", "rotated token", limit=5)

    assert len(results) == 1
    assert results[0].thread_id == "thread-a"


def test_archive_ignores_duplicate_source_message_ids(tmp_path):
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    turns = [
        RecallTurn(
            role="human",
            content="Remember the rollback plan",
            source_message_id="h-1",
        ),
        RecallTurn(
            role="ai",
            content="We pinned the previous image tag.",
            source_message_id="ai-1",
        ),
    ]

    archive.append_turns(thread_id="thread-1", agent_name="lead_agent", turns=turns)
    archive.append_turns(thread_id="thread-1", agent_name="lead_agent", turns=turns)

    results = archive.search_global("previous image tag", limit=5)
    assert len(results) == 1
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_local_archive.py -q`

Expected: `FAIL` with import errors for the new recall modules

**Step 3: Write minimal implementation**

Create the archive primitives and filtering utilities:

```python
# backend/packages/harness/nion/recall/models.py
from dataclasses import dataclass


@dataclass(slots=True)
class RecallTurn:
    role: str
    content: str
    source_message_id: str | None = None


@dataclass(slots=True)
class RecallSearchResult:
    thread_id: str
    agent_name: str
    role: str
    snippet: str
    created_at: str
```

```python
# backend/packages/harness/nion/recall/filtering.py
from __future__ import annotations

from typing import Any


def normalize_message_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        text_parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = str(block.get("text", "")).strip()
                if text:
                    text_parts.append(text)
        return "\n".join(text_parts).strip()
    return str(content).strip()
```

```python
# backend/packages/harness/nion/recall/local_archive.py
from __future__ import annotations

import hashlib
import sqlite3
from pathlib import Path

from nion.recall.models import RecallSearchResult, RecallTurn


class LocalRecallArchive:
    def __init__(self, path: Path) -> None:
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS recall_turns (
                    id INTEGER PRIMARY KEY,
                    thread_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    source_message_id TEXT,
                    content TEXT NOT NULL,
                    content_sha256 TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE UNIQUE INDEX IF NOT EXISTS recall_turns_thread_source_message_idx
                ON recall_turns(thread_id, source_message_id)
                WHERE source_message_id IS NOT NULL;

                CREATE VIRTUAL TABLE IF NOT EXISTS recall_fts
                USING fts5(thread_id, agent_name, role, content, content='recall_turns', content_rowid='id');
                """
            )

    def append_turns(self, *, thread_id: str, agent_name: str, turns: list[RecallTurn]) -> None:
        with self._connect() as conn:
            for turn in turns:
                digest = hashlib.sha256(turn.content.encode("utf-8")).hexdigest()
                cursor = conn.execute(
                    """
                    INSERT OR IGNORE INTO recall_turns(
                        thread_id, agent_name, role, source_message_id, content, content_sha256
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        thread_id,
                        agent_name,
                        turn.role,
                        turn.source_message_id,
                        turn.content,
                        digest,
                    ),
                )
                if cursor.rowcount:
                    conn.execute(
                        "INSERT INTO recall_fts(rowid, thread_id, agent_name, role, content) VALUES (?, ?, ?, ?, ?)",
                        (cursor.lastrowid, thread_id, agent_name, turn.role, turn.content),
                    )

    def search_global(self, query: str, limit: int = 5) -> list[RecallSearchResult]:
        return self._search(query=query, limit=limit)

    def search_thread(self, thread_id: str, query: str, limit: int = 5) -> list[RecallSearchResult]:
        return self._search(query=query, limit=limit, thread_id=thread_id)

    def _search(self, *, query: str, limit: int, thread_id: str | None = None) -> list[RecallSearchResult]:
        params: list[object] = [query]
        where = ["recall_fts MATCH ?"]
        if thread_id is not None:
            where.append("recall_turns.thread_id = ?")
            params.append(thread_id)
        params.append(limit)

        sql = f"""
            SELECT recall_turns.thread_id, recall_turns.agent_name, recall_turns.role,
                   snippet(recall_fts, 3, '[', ']', '...', 16) AS snippet,
                   recall_turns.created_at
            FROM recall_fts
            JOIN recall_turns ON recall_turns.id = recall_fts.rowid
            WHERE {' AND '.join(where)}
            ORDER BY bm25(recall_fts), recall_turns.id DESC
            LIMIT ?
        """
        with self._connect() as conn:
            rows = conn.execute(sql, tuple(params)).fetchall()
        return [RecallSearchResult(**dict(row)) for row in rows]
```

Add `Paths.recall_db_file` in `backend/packages/harness/nion/config/paths.py`:

```python
@property
def recall_db_file(self) -> Path:
    return self.base_dir / "recall.sqlite3"
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_local_archive.py -q`

Expected: `3 passed`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/recall/__init__.py backend/packages/harness/nion/recall/models.py backend/packages/harness/nion/recall/filtering.py backend/packages/harness/nion/recall/local_archive.py backend/packages/harness/nion/config/paths.py backend/tests/test_local_archive.py
git commit -F - <<'EOF'
Create a local transcript archive for Hermes-style recall

Add a SQLite FTS5 archive with thread-scoped and global search semantics,
message-ID-aware dedupe, and connection settings that tolerate multi-process writes.

Constraint: Structured memory must remain the source of truth for profile facts
Constraint: Recall continuity must never read across thread boundaries
Rejected: Reuse memory.json for transcript recall | wrong storage shape and poor search semantics
Rejected: Content-only dedupe | repeated prompts would collide across real turns
Confidence: high
Scope-risk: moderate
Directive: Keep thread continuity and global search as separate APIs and semantics
Tested: uv run pytest tests/test_local_archive.py -q
Not-tested: SQLite behavior under sustained write contention from multiple worker processes
EOF
```

### Task 2: hermes-session-recall-1-capture-and-continuity

**Files:**
- Create: `backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py`
- Create: `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Test: `backend/tests/test_recall_capture_middleware.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_recall_capture_middleware.py`:

```python
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.agents.middlewares.recall_capture_middleware import RecallCaptureMiddleware


def _runtime(thread_id: str) -> Runtime:
    return Runtime(context={"thread_id": thread_id})


def test_capture_archives_only_new_recallable_turns(tmp_path):
    middleware = RecallCaptureMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(content="Old question", id="h-old"),
            AIMessage(content="Old answer", id="ai-old"),
            SystemMessage(content="<continuity_context>\nOld snippet\n</continuity_context>"),
            HumanMessage(content="How did we fix staging auth?", id="h-1"),
            AIMessage(content="We rotated the staging token and restarted the worker.", id="ai-1"),
        ]
    }

    middleware.after_agent(state, _runtime("thread-1"))
    middleware.after_agent(state, _runtime("thread-1"))

    results = middleware._archive.search_global("staging token", limit=5)
    assert len(results) == 1
    assert "rotated the staging token" in results[0].snippet


def test_capture_normalizes_mixed_content_without_serializing_raw_blocks(tmp_path):
    middleware = RecallCaptureMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(
                content=[
                    {"type": "text", "text": "Summarize the screenshot"},
                    {"type": "image_url", "image_url": "file:///tmp/example.png"},
                ],
                id="h-1",
            ),
            AIMessage(content="It shows a login form.", id="ai-1"),
        ]
    }

    middleware.after_agent(state, _runtime("thread-1"))

    results = middleware._archive.search_global("Summarize the screenshot", limit=5)
    assert len(results) == 1
    assert "image_url" not in results[0].snippet


def test_capture_ignores_view_image_middleware_prompts(tmp_path):
    middleware = RecallCaptureMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(content="Analyze the image", id="h-1"),
            HumanMessage(
                content=[
                    {"type": "text", "text": "Here are the images you've viewed:"},
                    {"type": "image_url", "image_url": "file:///tmp/example.png"},
                ],
                id="vh-1",
            ),
            AIMessage(content="The screenshot shows a login form.", id="ai-1"),
        ]
    }

    middleware.after_agent(state, _runtime("thread-1"))

    assert middleware._archive.search_global("Here are the images you've viewed", limit=5) == []


def test_before_model_injects_thread_scoped_continuity_block(tmp_path):
    capture = RecallCaptureMiddleware(base_dir=tmp_path)
    capture._archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            capture._turn("human", "How did we fix staging auth?", source_message_id="h-1"),
            capture._turn(
                "ai",
                "We rotated the staging token and restarted the worker.",
                source_message_id="ai-1",
            ),
        ],
    )
    capture._archive.append_turns(
        thread_id="thread-2",
        agent_name="lead_agent",
        turns=[
            capture._turn("ai", "We rotated the production token.", source_message_id="ai-2"),
        ],
    )

    middleware = ContinuityMiddleware(base_dir=tmp_path)
    update = middleware.before_model(
        {"messages": [HumanMessage(content="continue the staging fix", id="h-2")]},
        _runtime("thread-1"),
    )

    assert update is not None
    injected = update["messages"][0]
    assert isinstance(injected, SystemMessage)
    assert "continuity_context" in str(injected.content).lower()
    assert "staging token" in str(injected.content)
    assert "production token" not in str(injected.content)
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_recall_capture_middleware.py -q`

Expected: `FAIL` with import errors for the new middleware modules

**Step 3: Write minimal implementation**

Implement the capture and continuity middlewares:

```python
# backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py
from __future__ import annotations

import re
from typing import Any

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.recall.filtering import normalize_message_content
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallTurn

_UPLOAD_BLOCK_RE = re.compile(r"<uploaded_files>[\s\S]*?</uploaded_files>\n*", re.IGNORECASE)
_EXCLUDED_HUMAN_PREFIXES = (
    "Here are the images you've viewed:",
    "Here are the details of the images you've viewed:",
)


class RecallCaptureMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir=None, agent_name: str = "lead_agent"):
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._archive = LocalRecallArchive(self._paths.recall_db_file)
        self._agent_name = agent_name

    def _turn(
        self,
        role: str,
        content: str,
        *,
        source_message_id: str | None = None,
    ) -> RecallTurn:
        return RecallTurn(role=role, content=content, source_message_id=source_message_id)

    def _collect_latest_exchange(self, messages: list[Any]) -> list[RecallTurn]:
        recallable: list[RecallTurn] = []
        for msg in messages:
            msg_type = getattr(msg, "type", None)
            if msg_type == "human":
                content = normalize_message_content(getattr(msg, "content", ""))
                if not content:
                    continue
                if "<uploaded_files>" in content:
                    content = _UPLOAD_BLOCK_RE.sub("", content).strip()
                if not content:
                    continue
                if any(content.startswith(prefix) for prefix in _EXCLUDED_HUMAN_PREFIXES):
                    continue
                recallable.append(
                    self._turn(
                        "human",
                        content,
                        source_message_id=getattr(msg, "id", None),
                    )
                )
            elif msg_type == "ai" and not getattr(msg, "tool_calls", None):
                content = normalize_message_content(getattr(msg, "content", ""))
                if not content:
                    continue
                recallable.append(
                    self._turn(
                        "ai",
                        content,
                        source_message_id=getattr(msg, "id", None),
                    )
                )

        trailing_ai: list[RecallTurn] = []
        for turn in reversed(recallable):
            if turn.role == "ai":
                trailing_ai.append(turn)
                continue
            if turn.role == "human":
                return [turn, *reversed(trailing_ai)] if trailing_ai else []
        return []

    def after_agent(self, state: AgentState, runtime: Runtime) -> dict | None:
        thread_id = runtime.context.get("thread_id")
        if not thread_id:
            return None
        turns = self._collect_latest_exchange(state.get("messages", []))
        if turns:
            self._archive.append_turns(thread_id=thread_id, agent_name=self._agent_name, turns=turns)
        return None
```

```python
# backend/packages/harness/nion/agents/middlewares/continuity_middleware.py
from __future__ import annotations

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.recall.local_archive import LocalRecallArchive


class ContinuityMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir=None):
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._archive = LocalRecallArchive(self._paths.recall_db_file)

    def before_model(self, state: AgentState, runtime: Runtime) -> dict | None:
        thread_id = runtime.context.get("thread_id")
        if not thread_id:
            return None

        latest_human = next(
            (
                message
                for message in reversed(state.get("messages", []))
                if isinstance(message, HumanMessage)
            ),
            None,
        )
        if latest_human is None:
            return None

        results = self._archive.search_thread(
            thread_id,
            str(latest_human.content),
            limit=3,
        )
        if not results:
            return None

        summary = "\n".join(f"- {row.snippet}" for row in results)
        return {
            "messages": [
                SystemMessage(
                    content=f"<continuity_context>\n{summary}\n</continuity_context>"
                )
            ]
        }
```

Register both middlewares in `_build_middlewares()` in `backend/packages/harness/nion/agents/lead_agent/agent.py`:

- append `RecallCaptureMiddleware(agent_name=agent_name or "lead_agent")` immediately after `MemoryMiddleware(...)`
- append `ContinuityMiddleware()` immediately after `RecallCaptureMiddleware(...)`

This order matters:

- `ContinuityMiddleware.before_model()` runs before later before-model middlewares in the same pass
- `RecallCaptureMiddleware.after_agent()` runs before `MemoryMiddleware.after_agent()` because after-agent middleware unwinds in reverse order
- continuity injection is a `SystemMessage`, so it is not recallable and does not enter the structured-memory queue

**Step 4: Run tests to verify they pass**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_recall_capture_middleware.py -q`

Expected: `4 passed`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py backend/packages/harness/nion/agents/middlewares/continuity_middleware.py backend/packages/harness/nion/agents/lead_agent/agent.py backend/tests/test_recall_capture_middleware.py
git commit -F - <<'EOF'
Inject thread-safe continuity recall without polluting memory

Capture only the newest recallable exchange after each completed run and inject
thread-scoped continuity as an ephemeral system message before the next model call.

Constraint: Continuity must remain per-thread and non-authoritative
Constraint: Recall and structured memory must never persist continuity injection messages
Rejected: Global search for continuity lookup | leaks transcript snippets across threads
Rejected: HumanMessage-based continuity injection | would re-enter recall and memory filters
Confidence: high
Scope-risk: moderate
Directive: Keep continuity injection ephemeral and thread-scoped; do not reuse it for durable memory
Tested: uv run pytest tests/test_recall_capture_middleware.py -q
Not-tested: Long-running threads with repeated identical content but missing message IDs
EOF
```

### Task 3: hermes-session-recall-1-api-and-ui

**Files:**
- Create: `backend/app/gateway/routers/recall.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Create: `backend/tests/test_recall_router.py`
- Create: `frontend/src/core/recall/api.ts`
- Create: `frontend/src/core/recall/hooks.ts`
- Create: `frontend/src/core/recall/types.ts`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`

**Step 1: Write the failing tests**

Create `backend/tests/test_recall_router.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import RecallTurn


def test_recall_search_returns_global_results(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="We fixed staging by rotating the token.",
                source_message_id="ai-1",
            )
        ],
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/recall/search", params={"q": "rotating token", "limit": 5})

    assert response.status_code == 200
    payload = response.json()
    assert payload["scope"] == "global"
    assert payload["results"][0]["thread_id"] == "thread-1"


def test_recall_search_honors_thread_scope(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    archive = LocalRecallArchive(tmp_path / "recall.sqlite3")
    archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="We rotated the staging token.",
                source_message_id="ai-1",
            )
        ],
    )
    archive.append_turns(
        thread_id="thread-2",
        agent_name="lead_agent",
        turns=[
            RecallTurn(
                role="ai",
                content="We rotated the production token.",
                source_message_id="ai-2",
            )
        ],
    )

    with TestClient(create_app()) as client:
        response = client.get(
            "/api/recall/search",
            params={"q": "rotated token", "limit": 5, "thread_id": "thread-1"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["scope"] == "thread"
    assert len(payload["results"]) == 1
    assert payload["results"][0]["thread_id"] == "thread-1"
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_recall_router.py -q`

Expected: `FAIL` with `404` on `/api/recall/search`

**Step 3: Write minimal implementation**

Add the router and frontend search UI:

```python
# backend/app/gateway/routers/recall.py
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.recall.local_archive import LocalRecallArchive

router = APIRouter(prefix="/api/recall", tags=["recall"])


class RecallResultResponse(BaseModel):
    thread_id: str
    agent_name: str
    role: str
    snippet: str
    created_at: str


class RecallSearchResponse(BaseModel):
    scope: Literal["global", "thread"]
    results: list[RecallResultResponse]


@router.get("/search", response_model=RecallSearchResponse)
async def search_recall(
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    thread_id: str | None = Query(None),
):
    archive = LocalRecallArchive(get_paths().recall_db_file)
    if thread_id:
        return RecallSearchResponse(
            scope="thread",
            results=archive.search_thread(thread_id, q, limit),
        )
    return RecallSearchResponse(
        scope="global",
        results=archive.search_global(q, limit),
    )
```

```ts
// frontend/src/core/recall/api.ts
import { getBackendBaseURL } from "@/core/config";
import { createApiErrorFromResponse } from "@/core/errors/api-errors";

import type { RecallSearchResponse } from "./types";

export async function searchRecall(
  q: string,
  limit = 5,
  threadId?: string,
): Promise<RecallSearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (threadId) params.set("thread_id", threadId);
  const response = await fetch(
    `${getBackendBaseURL()}/api/recall/search?${params.toString()}`,
  );
  if (!response.ok) {
    throw await createApiErrorFromResponse(response, {
      code: "recall.load_failed",
      message: `Failed to load recall results: ${response.statusText}`,
    });
  }
  return (await response.json()) as RecallSearchResponse;
}
```

```ts
// frontend/src/core/recall/hooks.ts
import { useQuery } from "@tanstack/react-query";

import { searchRecall } from "./api";

export function useRecallSearch(query: string, limit = 5, threadId?: string) {
  const trimmed = query.trim();
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["recall-search", trimmed, limit, threadId ?? null],
    queryFn: () => searchRecall(trimmed, limit, threadId),
    enabled: trimmed.length > 0,
  });

  return {
    scope: data?.scope ?? (threadId ? "thread" : "global"),
    results: data?.results ?? [],
    isLoading,
    isFetching,
    error,
  };
}
```

Render a real manual-search flow in `frontend/src/components/workspace/settings/memory-settings-page.tsx`:

- keep the existing structured-memory markdown block unchanged
- add a separate `Recall` section below it
- add an input, submit button, loading state, empty state, error state, and result list
- wire it to `useRecallSearch(submittedQuery, 5)`
- render each result with snippet text, thread ID, agent name, and relative timestamp
- add dedicated i18n keys for recall title, description, search placeholder, search button, empty state, and load failure

**Step 4: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_local_archive.py tests/test_recall_capture_middleware.py tests/test_recall_router.py -q
```

Expected: all tests pass

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Expected: `eslint` and `tsc --noEmit` both succeed

**Step 5: Commit**

```bash
git add backend/app/gateway/routers/recall.py backend/app/gateway/app.py backend/app/gateway/routers/__init__.py backend/tests/test_recall_router.py frontend/src/core/recall/api.ts frontend/src/core/recall/hooks.ts frontend/src/core/recall/types.ts frontend/src/components/workspace/settings/memory-settings-page.tsx frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts
git commit -F - <<'EOF'
Expose recall search through the gateway and settings UI

Publish recall as a separate API and manual search surface so transcript lookup
stays inspectable without mutating or conflating structured memory.

Constraint: Settings-page recall search is global by default and must remain distinct from thread continuity
Rejected: Merge recall results into /api/memory/status | makes durable memory and transcript recall impossible to reason about
Confidence: high
Scope-risk: moderate
Directive: Keep recall APIs read-only until governance and approvals are specified
Tested: uv run pytest tests/test_local_archive.py tests/test_recall_capture_middleware.py tests/test_recall_router.py -q; pnpm check
Not-tested: manual UX polish under very large result sets
EOF
```

### Final Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_local_archive.py tests/test_recall_capture_middleware.py tests/test_recall_router.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Manual Acceptance

- Memory settings still render the existing structured-memory block unchanged.
- Settings-page recall search works as a separate manual workflow with input, loading, empty, error, and result states.
- Continuity injection only reads from the current thread and never surfaces snippets from a different thread.
- Continuity injection never writes back into recall or `memory.json`.
- Duplicate source message IDs are not archived twice.
- Mixed-content messages are normalized to text snippets instead of serializing raw block payloads.
- Middleware-generated image detail prompts are not archived as transcript recall.
- No other lane needs to touch `backend/packages/harness/nion/recall/*`.
