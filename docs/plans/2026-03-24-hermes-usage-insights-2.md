# Hermes Usage Insights Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Hermes-style usage and diagnostics views that persist run-level summaries, show the latest diagnostics for a thread, and surface aggregate insights across recent workspace threads.

**Architecture:** Reuse the token and reasoning metadata already flowing through `usage_metadata`, tool calls, and artifact state. Add a small telemetry store in `NION_HOME`, capture run-boundary deltas with middleware, expose a read-only insights API for thread and recent-workspace summaries, and render insights in existing workspace surfaces without changing message semantics.

**Tech Stack:** FastAPI, LangGraph middleware, SQLite, React, TanStack Query, tokenlens

---

**Execution Notes**

- Use `@test-driven-development` and `@verification-before-completion`.
- Keep this lane independent from recall by writing to `backend/packages/harness/nion/telemetry/*`, not `backend/packages/harness/nion/recall/*`.
- Do not edit settings shell files in this lane; render insights in the chat page and existing workspace chrome.
- Treat telemetry as append-only, read-only infrastructure until retention and export rules are defined.
- Use `reasoning_messages` for this lane. Do not claim real reasoning token counts until providers expose them in `usage_metadata`.
- Telemetry writes must be best-effort: log failures, but never block a run from finishing.

### Task 1: hermes-usage-insights-2-run-telemetry-store

**Files:**
- Create: `backend/packages/harness/nion/telemetry/__init__.py`
- Create: `backend/packages/harness/nion/telemetry/models.py`
- Create: `backend/packages/harness/nion/telemetry/store.py`
- Modify: `backend/packages/harness/nion/config/paths.py`
- Test: `backend/tests/test_telemetry_store.py`

**Step 1: Write the failing test**

Create `backend/tests/test_telemetry_store.py`:

```python
from nion.telemetry.models import RunInsightRecord
from nion.telemetry.store import TelemetryStore


def test_store_records_run_rows_and_returns_latest_summary_per_thread(tmp_path):
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_run(
        RunInsightRecord(
            thread_id="thread-1",
            agent_name="lead_agent",
            input_tokens=120,
            output_tokens=30,
            reasoning_messages=1,
            tool_calls=2,
            artifact_count=1,
            duration_ms=4200,
        )
    )
    store.record_run(
        RunInsightRecord(
            thread_id="thread-1",
            agent_name="lead_agent",
            input_tokens=25,
            output_tokens=10,
            reasoning_messages=0,
            tool_calls=1,
            artifact_count=0,
            duration_ms=900,
        )
    )
    store.record_run(
        RunInsightRecord(
            thread_id="thread-2",
            agent_name="lead_agent",
            input_tokens=80,
            output_tokens=20,
            reasoning_messages=1,
            tool_calls=3,
            artifact_count=2,
            duration_ms=2500,
        )
    )

    latest = store.get_latest_thread_summary("thread-1")
    recent = store.list_latest_for_threads(["thread-1", "thread-2"])

    assert latest.thread_id == "thread-1"
    assert latest.input_tokens == 25
    assert latest.tool_calls == 1
    assert {item.thread_id for item in recent} == {"thread-1", "thread-2"}
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_telemetry_store.py -q`

Expected: `FAIL` with `ModuleNotFoundError: No module named 'nion.telemetry.store'`

**Step 3: Write minimal implementation**

```python
# backend/packages/harness/nion/telemetry/models.py
from dataclasses import dataclass


@dataclass(slots=True)
class RunInsightRecord:
    thread_id: str
    agent_name: str
    input_tokens: int
    output_tokens: int
    reasoning_messages: int
    tool_calls: int
    artifact_count: int
    duration_ms: int
```

```python
# backend/packages/harness/nion/telemetry/store.py
import sqlite3
from pathlib import Path

from nion.telemetry.models import RunInsightRecord


class TelemetryStore:
    def __init__(self, path: Path) -> None:
        self._path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS run_insights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    thread_id TEXT NOT NULL,
                    agent_name TEXT NOT NULL,
                    input_tokens INTEGER NOT NULL,
                    output_tokens INTEGER NOT NULL,
                    reasoning_messages INTEGER NOT NULL,
                    tool_calls INTEGER NOT NULL,
                    artifact_count INTEGER NOT NULL,
                    duration_ms INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

    def record_run(self, record: RunInsightRecord) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute(
                """
                INSERT INTO run_insights(
                    thread_id, agent_name, input_tokens, output_tokens,
                    reasoning_messages, tool_calls, artifact_count, duration_ms
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.thread_id,
                    record.agent_name,
                    record.input_tokens,
                    record.output_tokens,
                    record.reasoning_messages,
                    record.tool_calls,
                    record.artifact_count,
                    record.duration_ms,
                ),
            )

    def get_latest_thread_summary(self, thread_id: str) -> RunInsightRecord:
        with sqlite3.connect(self._path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                """
                SELECT thread_id, agent_name, input_tokens, output_tokens,
                       reasoning_messages, tool_calls, artifact_count, duration_ms
                FROM run_insights
                WHERE thread_id = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (thread_id,),
            ).fetchone()
        if row is None:
            raise LookupError(thread_id)
        return RunInsightRecord(**dict(row))

    def list_latest_for_threads(self, thread_ids: list[str]) -> list[RunInsightRecord]:
        if not thread_ids:
            return []

        placeholders = ",".join("?" for _ in thread_ids)
        with sqlite3.connect(self._path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                f"""
                SELECT thread_id, agent_name, input_tokens, output_tokens,
                       reasoning_messages, tool_calls, artifact_count, duration_ms
                FROM run_insights
                WHERE id IN (
                    SELECT MAX(id)
                    FROM run_insights
                    WHERE thread_id IN ({placeholders})
                    GROUP BY thread_id
                )
                ORDER BY id DESC
                """,
                tuple(thread_ids),
            ).fetchall()
        return [RunInsightRecord(**dict(row)) for row in rows]
```

Add `Paths.telemetry_db_file`.

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_telemetry_store.py -q`

Expected: `1 passed`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/telemetry/__init__.py backend/packages/harness/nion/telemetry/models.py backend/packages/harness/nion/telemetry/store.py backend/packages/harness/nion/config/paths.py backend/tests/test_telemetry_store.py
git commit -F - <<'EOF'
Create a run-level telemetry store for Hermes-style usage insights

Persist per-run summary rows so diagnostics can be queried without replaying
entire transcripts and without confusing cumulative thread state for one run.

Constraint: This lane must stay independent from structured memory and transcript recall
Rejected: Derive workspace insights only in the browser | no durable cross-session summary
Confidence: high
Scope-risk: narrow
Directive: Keep telemetry append-only and read-only until retention policy is specified
Tested: uv run pytest tests/test_telemetry_store.py -q
Not-tested: database growth under high-volume workloads
EOF
```

### Task 2: hermes-usage-insights-2-run-boundary-middleware

**Files:**
- Create: `backend/packages/harness/nion/agents/middlewares/telemetry_middleware.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Test: `backend/tests/test_telemetry_middleware.py`

**Step 1: Write the failing test**

Create `backend/tests/test_telemetry_middleware.py`:

```python
from langchain_core.messages import AIMessage, HumanMessage

from nion.agents.middlewares.telemetry_middleware import TelemetryMiddleware


def test_after_agent_records_only_new_run_metrics(fake_runtime, tmp_path):
    middleware = TelemetryMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(content="old question"),
            AIMessage(
                content="old answer",
                tool_calls=[],
                usage_metadata={"input_tokens": 50, "output_tokens": 20, "total_tokens": 70},
            ),
        ],
        "artifacts": ["/mnt/user-data/outputs/old-report.md"],
    }

    middleware.before_agent(state, fake_runtime(thread_id="thread-1"))
    state["messages"].append(
        AIMessage(
            content="new answer",
            tool_calls=[{"name": "web_search", "args": {}, "id": "call-1"}],
            usage_metadata={"input_tokens": 100, "output_tokens": 40, "total_tokens": 140},
            additional_kwargs={"reasoning_content": "hidden reasoning"},
        )
    )
    state["artifacts"].append("/mnt/user-data/outputs/new-report.md")
    middleware.after_agent(state, fake_runtime(thread_id="thread-1"))

    latest = middleware._store.get_latest_thread_summary("thread-1")
    assert latest.input_tokens == 100
    assert latest.output_tokens == 40
    assert latest.reasoning_messages == 1
    assert latest.tool_calls == 1
    assert latest.artifact_count == 1
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_telemetry_middleware.py -q`

Expected: `FAIL` with import errors for `TelemetryMiddleware`

**Step 3: Write minimal implementation**

```python
import logging
import time

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware

from nion.config.paths import Paths, get_paths
from nion.telemetry.models import RunInsightRecord
from nion.telemetry.store import TelemetryStore

logger = logging.getLogger(__name__)


class TelemetryMiddlewareState(AgentState):
    pass


class TelemetryMiddleware(AgentMiddleware[TelemetryMiddlewareState]):
    def __init__(self, base_dir=None):
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._store = TelemetryStore(self._paths.telemetry_db_file)

    def before_agent(self, state, runtime):
        return {
            "_telemetry_started_at": time.time(),
            "_telemetry_message_count": len(state.get("messages", [])),
            "_telemetry_artifact_count": len(state.get("artifacts", []) or []),
        }

    def after_agent(self, state, runtime):
        started_at = state.get("_telemetry_started_at") or time.time()
        message_offset = state.get("_telemetry_message_count", 0)
        artifact_offset = state.get("_telemetry_artifact_count", 0)

        new_messages = state.get("messages", [])[message_offset:]
        ai_messages = [m for m in new_messages if getattr(m, "type", None) == "ai"]
        new_artifacts = (state.get("artifacts", []) or [])[artifact_offset:]

        record = RunInsightRecord(
            thread_id=runtime.context["thread_id"],
            agent_name=runtime.context.get("agent_name", "lead_agent"),
            input_tokens=sum((getattr(m, "usage_metadata", {}) or {}).get("input_tokens", 0) for m in ai_messages),
            output_tokens=sum((getattr(m, "usage_metadata", {}) or {}).get("output_tokens", 0) for m in ai_messages),
            reasoning_messages=sum(1 for m in ai_messages if getattr(m, "additional_kwargs", {}).get("reasoning_content")),
            tool_calls=sum(len(getattr(m, "tool_calls", []) or []) for m in ai_messages),
            artifact_count=len(new_artifacts),
            duration_ms=int((time.time() - started_at) * 1000),
        )

        try:
            self._store.record_run(record)
        except Exception:
            logger.exception("Failed to persist telemetry run summary")
        return None
```

Register `TelemetryMiddleware()` in `_build_middlewares()` after `TitleMiddleware()` and before `MemoryMiddleware()`.

**Step 4: Run test to verify it passes**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_telemetry_middleware.py -q`

Expected: `1 passed`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/middlewares/telemetry_middleware.py backend/packages/harness/nion/agents/lead_agent/agent.py backend/tests/test_telemetry_middleware.py
git commit -F - <<'EOF'
Capture run-boundary usage summaries for Hermes-style diagnostics

Record only the messages and artifacts created during the current run so the
telemetry layer reflects run deltas rather than cumulative thread state.

Constraint: Middleware must not mutate message semantics or interfere with streaming
Rejected: Sum the full thread state on every run | produces incorrect cumulative metrics
Confidence: high
Scope-risk: moderate
Directive: Keep telemetry writes best-effort and resilient to store failures
Tested: uv run pytest tests/test_telemetry_middleware.py -q
Not-tested: interrupted runs before final state is committed
EOF
```

### Task 3: hermes-usage-insights-2-gateway-insights-api

**Files:**
- Create: `backend/app/gateway/routers/insights.py`
- Modify: `backend/app/gateway/app.py`
- Create: `backend/tests/test_insights_router.py`

**Step 1: Write the failing test**

Create `backend/tests/test_insights_router.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.telemetry.models import RunInsightRecord
from nion.telemetry.store import TelemetryStore


def test_thread_and_workspace_insights_endpoints(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    store.record_run(
        RunInsightRecord(
            thread_id="thread-1",
            agent_name="lead_agent",
            input_tokens=10,
            output_tokens=5,
            reasoning_messages=1,
            tool_calls=2,
            artifact_count=1,
            duration_ms=250,
        )
    )
    store.record_run(
        RunInsightRecord(
            thread_id="thread-2",
            agent_name="lead_agent",
            input_tokens=30,
            output_tokens=7,
            reasoning_messages=0,
            tool_calls=1,
            artifact_count=0,
            duration_ms=500,
        )
    )

    client = TestClient(create_app())

    thread_response = client.get("/api/insights/threads/thread-1")
    workspace_response = client.post(
        "/api/insights/workspace/query",
        json={"thread_ids": ["thread-1", "thread-2"]},
    )

    assert thread_response.status_code == 200
    assert thread_response.json()["thread_id"] == "thread-1"
    assert workspace_response.status_code == 200
    assert workspace_response.json()["aggregate"]["thread_count"] == 2
    assert workspace_response.json()["aggregate"]["input_tokens"] == 40


def test_thread_insights_endpoint_returns_404_for_missing_thread(tmp_path, monkeypatch):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    client = TestClient(create_app())

    response = client.get("/api/insights/threads/missing-thread")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "insights.thread_not_found"
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_insights_router.py -q`

Expected: `FAIL` with `404` on missing router(s)

**Step 3: Write minimal implementation**

Add the router:

```python
# backend/app/gateway/routers/insights.py
from fastapi import APIRouter
from pydantic import BaseModel

from app.gateway.api_errors import raise_api_error
from nion.config.paths import get_paths
from nion.telemetry.store import TelemetryStore

router = APIRouter(prefix="/api/insights", tags=["insights"])


class ThreadInsightsResponse(BaseModel):
    thread_id: str
    agent_name: str
    input_tokens: int
    output_tokens: int
    reasoning_messages: int
    tool_calls: int
    artifact_count: int
    duration_ms: int


class WorkspaceInsightsQuery(BaseModel):
    thread_ids: list[str]


class WorkspaceAggregateResponse(BaseModel):
    thread_count: int
    input_tokens: int
    output_tokens: int
    reasoning_messages: int
    tool_calls: int
    artifact_count: int
    duration_ms: int


@router.get("/threads/{thread_id}", response_model=ThreadInsightsResponse)
async def get_thread_insights(thread_id: str):
    store = TelemetryStore(get_paths().telemetry_db_file)
    try:
        record = store.get_latest_thread_summary(thread_id)
    except LookupError:
        raise_api_error(
            404,
            "insights.thread_not_found",
            message=f"No telemetry found for thread '{thread_id}'",
            params={"thread_id": thread_id},
        )
    return ThreadInsightsResponse(**record.__dict__)


@router.post("/workspace/query")
async def query_workspace_insights(payload: WorkspaceInsightsQuery):
    store = TelemetryStore(get_paths().telemetry_db_file)
    records = store.list_latest_for_threads(payload.thread_ids)
    aggregate = WorkspaceAggregateResponse(
        thread_count=len(records),
        input_tokens=sum(r.input_tokens for r in records),
        output_tokens=sum(r.output_tokens for r in records),
        reasoning_messages=sum(r.reasoning_messages for r in records),
        tool_calls=sum(r.tool_calls for r in records),
        artifact_count=sum(r.artifact_count for r in records),
        duration_ms=sum(r.duration_ms for r in records),
    )
    return {
        "threads": [ThreadInsightsResponse(**record.__dict__) for record in records],
        "aggregate": aggregate,
    }
```

Mount the router in `backend/app/gateway/app.py`.

**Step 4: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_telemetry_store.py tests/test_telemetry_middleware.py tests/test_insights_router.py -q
```

Expected: all tests pass

**Step 5: Commit**

```bash
git add backend/app/gateway/routers/insights.py backend/app/gateway/app.py backend/tests/test_insights_router.py
git commit -F - <<'EOF'
Expose thread and workspace insights through the gateway

Publish read-only telemetry summaries with stable gateway error semantics so
thread diagnostics and recent-workspace rollups can be rendered without replay.

Constraint: This lane must avoid editing recall and settings-shell surfaces
Rejected: Let LookupError bubble from the router | breaks gateway error conventions
Confidence: high
Scope-risk: moderate
Directive: Keep the API read-only until retention and export requirements are defined
Tested: uv run pytest tests/test_telemetry_store.py tests/test_telemetry_middleware.py tests/test_insights_router.py -q
Not-tested: large thread_id batches and rate-limited polling behavior
EOF
```

### Task 4: hermes-usage-insights-2-workspace-surfaces

**Files:**
- Create: `frontend/src/core/insights/types.ts`
- Create: `frontend/src/core/insights/api.ts`
- Create: `frontend/src/core/insights/hooks.ts`
- Create: `frontend/src/components/workspace/insights/thread-insights-card.tsx`
- Create: `frontend/src/components/workspace/insights/recent-insights-summary.tsx`
- Modify: `frontend/src/app/workspace/chats/[thread_id]/page.tsx`
- Modify: `frontend/src/components/workspace/recent-chat-list.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`

**Step 1: Write the failing test expectations**

This task relies on `pnpm check` plus manual UI verification instead of new frontend unit tests.

Expected pre-change failures:
- No thread-level insights card is rendered on the chat page.
- No recent-workspace aggregate summary is rendered near the recent thread list.

**Step 2: Write minimal implementation**

Create a small frontend data layer:

```ts
// frontend/src/core/insights/types.ts
export interface ThreadInsights {
  thread_id: string;
  agent_name: string;
  input_tokens: number;
  output_tokens: number;
  reasoning_messages: number;
  tool_calls: number;
  artifact_count: number;
  duration_ms: number;
}

export interface WorkspaceInsightsResponse {
  threads: ThreadInsights[];
  aggregate: {
    thread_count: number;
    input_tokens: number;
    output_tokens: number;
    reasoning_messages: number;
    tool_calls: number;
    artifact_count: number;
    duration_ms: number;
  };
}
```

Render two UI surfaces:

- `ThreadInsightsCard` on `frontend/src/app/workspace/chats/[thread_id]/page.tsx` for the active thread
- `RecentInsightsSummary` inside `frontend/src/components/workspace/recent-chat-list.tsx`, driven by recent thread IDs from `useThreads()`

Placement guidance:

- Do not place the thread card inside `chat-box.tsx`; that component is the artifact split-pane container, not the primary insight surface.
- Render the thread card in the non-new-thread chat page flow, above the message list and below the thread header.
- Render the workspace aggregate as a compact sidebar summary above the recent chat items or directly under the group label.

**Step 3: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Expected: `eslint` and `tsc --noEmit` both succeed

**Step 4: Commit**

```bash
git add frontend/src/core/insights/types.ts frontend/src/core/insights/api.ts frontend/src/core/insights/hooks.ts frontend/src/components/workspace/insights/thread-insights-card.tsx frontend/src/components/workspace/insights/recent-insights-summary.tsx frontend/src/app/workspace/chats/[thread_id]/page.tsx frontend/src/components/workspace/recent-chat-list.tsx frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts
git commit -F - <<'EOF'
Render Hermes-style usage insights in existing workspace surfaces

Surface latest thread diagnostics in the chat page and recent-thread rollups in
the sidebar so operators can see usage context where work already happens.

Constraint: This lane must not edit the shared settings shell
Rejected: Mount the UI inside chat-box split panes | wrong surface and weak workspace visibility
Confidence: medium
Scope-risk: moderate
Directive: Treat 404 thread telemetry as an empty state in the UI, not as a fatal page error
Tested: pnpm check
Not-tested: visual regression on very small screens
EOF
```

### Final Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_telemetry_store.py tests/test_telemetry_middleware.py tests/test_insights_router.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Manual Acceptance

- A completed thread shows the latest run summary in the chat page, including token usage, tool calls, artifact count, duration, and reasoning message count.
- The recent chat sidebar shows an aggregate summary across recent threads returned by the workspace insights query.
- Insights remain visible after page reload because they come from gateway telemetry.
- Missing telemetry for a thread does not crash the page; the UI treats it as an empty state.
- Telemetry write failures do not block the agent from finishing a run.
- The lane does not touch recall files, channel runtime files, or settings shell files.
