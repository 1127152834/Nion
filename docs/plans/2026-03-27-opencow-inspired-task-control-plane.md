# OpenCow-Inspired Task Control Plane Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the five OpenCow-inspired capabilities to Nion in the smallest shippable slices: durable task objects, a user-facing event center, a context injection planner, task-aware automation, and richer delegated-task lifecycle UI.

**Architecture:** Keep Nion thread-first. Do not replace threads with tasks. Add a thin product-layer `Task` object above threads, then attach automation, event-center, and UI affordances to that object. Reuse existing daemon diagnostics, incident records, automation repository patterns, sidebar routing, and frontend `node:test` source-contract tests to keep the first pass small and reversible.

**Tech Stack:** FastAPI, Pydantic, existing `app/runtime/app_factory.py`, Python repositories, React/Next.js, React Query, desktop hash routing, `node:test`, pytest, ruff, existing automation and diagnostics modules.

---

## Preconditions

- Execute this plan in a dedicated worktree, not in a dirty primary workspace.
- Read the research artifacts first:
  - `docs/research/opencow-vs-nion-comparative-study.md`
  - `docs/research/opencow-vs-nion-conclusions.md`
- Do not add new dependencies.
- Prefer extending existing patterns:
  - repository/service/router in backend
  - `core/*/api.ts` + `hooks.ts` in frontend
  - route-source contract tests using `node:test`
- After each task, update relevant docs if the public surface changes:
  - `README.md`
  - `backend/CLAUDE.md`
  - any desktop-facing docs under `docs/desktop/`

### Task 1: Durable Task Object Foundation

**Files:**
- Create: `backend/app/tasks/__init__.py`
- Create: `backend/app/tasks/models.py`
- Create: `backend/app/tasks/repository.py`
- Create: `backend/app/tasks/service.py`
- Create: `backend/app/gateway/routers/tasks.py`
- Modify: `backend/app/runtime/app_factory.py`
- Test: `backend/tests/test_task_service.py`
- Test: `backend/tests/test_tasks_router.py`
- Create: `frontend/src/core/task-center/types.ts`
- Create: `frontend/src/core/task-center/api.ts`
- Create: `frontend/src/core/task-center/hooks.ts`
- Create: `frontend/src/app/workspace/tasks/page.tsx`
- Create: `frontend/src/components/workspace/tasks/task-center-page.tsx`
- Test: `frontend/src/components/workspace/task-center-routes.test.ts`
- Modify: `frontend/src/components/workspace/workspace-nav-chat-list.tsx`
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

**Step 1: Write the failing backend service test**

```python
from pathlib import Path

from app.tasks.repository import TaskRepository
from app.tasks.service import TaskService


def test_create_task_persists_and_tracks_thread_runs(tmp_path: Path) -> None:
    repository = TaskRepository(tmp_path / "tasks")
    service = TaskService(repository)

    task = service.create_task(
        title="Investigate bridge failures",
        description="Turn diagnostics into a durable task object",
        source_thread_id="thread-123",
    )
    service.attach_thread_run(
        task.id,
        thread_id="thread-456",
        kind="manual",
    )

    stored = service.get_task(task.id)
    assert stored is not None
    assert stored.source_thread_id == "thread-123"
    assert stored.current_thread_id == "thread-456"
    assert stored.run_history[0].thread_id == "thread-456"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_task_service.py -q`

Expected: FAIL with `ModuleNotFoundError: No module named 'app.tasks'` or missing `TaskService`.

**Step 3: Write minimal backend models**

```python
from pydantic import BaseModel, Field
from typing import Literal


class TaskRunRef(BaseModel):
    thread_id: str
    kind: Literal["manual", "automation"]
    created_at: str


class TaskRecord(BaseModel):
    id: str
    title: str
    description: str = ""
    state: Literal["backlog", "ready", "running", "blocked", "done"] = "backlog"
    source_thread_id: str | None = None
    current_thread_id: str | None = None
    parent_task_id: str | None = None
    run_history: list[TaskRunRef] = Field(default_factory=list)
    created_at: str
    updated_at: str
```

**Step 4: Write minimal repository and service**

```python
class TaskRepository:
    def __init__(self, base_dir: Path): ...
    def save(self, task: TaskRecord) -> TaskRecord: ...
    def get(self, task_id: str) -> TaskRecord | None: ...
    def list(self) -> list[TaskRecord]: ...


class TaskService:
    def __init__(self, repository: TaskRepository): ...
    def create_task(self, *, title: str, description: str = "", source_thread_id: str | None = None) -> TaskRecord: ...
    def attach_thread_run(self, task_id: str, *, thread_id: str, kind: Literal["manual", "automation"]) -> TaskRecord: ...
```

Implementation note:
- Copy the lightweight persistence style from `backend/packages/harness/nion/threads/repository.py`.
- Keep the first version file-backed and local, not relational.

**Step 5: Run backend service test to verify it passes**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_task_service.py -q`

Expected: PASS.

**Step 6: Write the failing router test**

```python
from fastapi.testclient import TestClient

from app.gateway.app import app


def test_tasks_router_crud_cycle() -> None:
    client = TestClient(app)

    created = client.post(
        "/api/tasks",
        json={"title": "Map OpenCow features", "description": "Research task"},
    )
    assert created.status_code == 201
    task_id = created.json()["task"]["id"]

    listing = client.get("/api/tasks")
    assert listing.status_code == 200
    assert any(item["id"] == task_id for item in listing.json()["tasks"])
```

**Step 7: Run router test to verify it fails**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_tasks_router.py -q`

Expected: FAIL with `404` for `/api/tasks`.

**Step 8: Implement `backend/app/gateway/routers/tasks.py` and mount it**

```python
router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("")
def list_tasks(...): ...


@router.post("", status_code=201)
def create_task(...): ...


@router.get("/{task_id}")
def get_task(task_id: str, ...): ...


@router.patch("/{task_id}")
def update_task(task_id: str, ...): ...
```

Mount it in `backend/app/runtime/app_factory.py` alongside `automation.router`.

**Step 9: Run backend tests**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_task_service.py tests/test_tasks_router.py -q`

Expected: PASS.

**Step 10: Write the failing frontend route/navigation contract test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace navigation exposes a task center entry", async () => {
  const source = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/workspace\/tasks/);
});

void test("desktop renderer registers the task center route", async () => {
  const source = await readFile(
    new URL("../../../../desktop/src/renderer/renderer-app.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/workspace\/tasks/);
});
```

**Step 11: Run frontend contract test to verify it fails**

Run: `node --test frontend/src/components/workspace/task-center-routes.test.ts`

Expected: FAIL because `/workspace/tasks` does not exist yet.

**Step 12: Implement frontend task-center API, route, page, and nav**

```ts
export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  state: "backlog" | "ready" | "running" | "blocked" | "done";
  source_thread_id?: string | null;
  current_thread_id?: string | null;
}

export async function loadTasks(): Promise<TaskRecord[]> {
  const response = await fetch(`${getBackendBaseURL()}/api/tasks`);
  ...
}
```

UI scope for first slice:
- render a simple list
- show state badge
- show source thread and current thread when present
- no drag-and-drop, no nested tasks yet

**Step 13: Run frontend verification**

Run: `node --test frontend/src/components/workspace/task-center-routes.test.ts`

Expected: PASS.

Run: `pnpm --dir frontend typecheck`

Expected: PASS.

**Step 14: Commit**

```bash
git add \
  backend/app/tasks \
  backend/app/gateway/routers/tasks.py \
  backend/app/runtime/app_factory.py \
  backend/tests/test_task_service.py \
  backend/tests/test_tasks_router.py \
  frontend/src/core/task-center \
  frontend/src/app/workspace/tasks/page.tsx \
  frontend/src/components/workspace/tasks/task-center-page.tsx \
  frontend/src/components/workspace/task-center-routes.test.ts \
  frontend/src/components/workspace/workspace-nav-chat-list.tsx \
  frontend/src/core/navigation/desktop-routes.ts \
  desktop/src/renderer/renderer-app.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts
git commit -m "feat: add durable task objects and task center skeleton"
```

### Task 2: Event Center on Top of Incidents and Diagnostics

**Files:**
- Create: `backend/app/daemon/routers/event_center.py`
- Modify: `backend/app/runtime/app_factory.py`
- Test: `backend/tests/test_daemon_event_center_api.py`
- Create: `frontend/src/core/event-center/types.ts`
- Create: `frontend/src/core/event-center/api.ts`
- Create: `frontend/src/core/event-center/hooks.ts`
- Create: `frontend/src/app/workspace/events/page.tsx`
- Create: `frontend/src/components/workspace/events/event-center-page.tsx`
- Test: `frontend/src/core/event-center/api.test.ts`
- Test: `frontend/src/components/workspace/event-center-routes.test.ts`
- Modify: `frontend/src/components/workspace/workspace-nav-chat-list.tsx`
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

**Step 1: Write the failing daemon event-center API test**

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app
from nion.telemetry.models import DiagnosticSnapshot, IncidentRecord
from nion.telemetry.store import TelemetryStore


def test_event_center_returns_incidents_before_plain_diagnostics(tmp_path) -> None:
    app = create_app()
    client = TestClient(app)
    store = TelemetryStore(tmp_path / "telemetry.sqlite3")
    app.state.daemon_service.attach_telemetry_store(store)

    store.record_incident(
        IncidentRecord(
            incident_id="incident-1",
            incident_type="subagent_failure",
            severity="high",
            status="open",
            source="agent_execution",
            summary="Subagent failed",
            details={"task_id": "task-1"},
        )
    )
    store.upsert_snapshot(
        DiagnosticSnapshot(
            scope_type="task",
            scope_id="task-1",
            status="error",
            summary="Delegated task failed",
            details={"task_id": "task-1"},
        )
    )

    response = client.get("/api/daemon/event-center")
    payload = response.json()
    assert response.status_code == 200
    assert payload["items"][0]["kind"] == "incident"
```

**Step 2: Run backend test to verify it fails**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_event_center_api.py -q`

Expected: FAIL with `404` for `/api/daemon/event-center`.

**Step 3: Implement the aggregation router**

```python
router = APIRouter(prefix="/api/daemon", tags=["daemon"])


@router.get("/event-center")
async def get_event_center(...):
    return {
        "items": [
            # incidents first
            # then recent task/thread/channel snapshots
        ]
    }
```

Implementation rules:
- incidents sort above plain diagnostics
- include stable `kind`, `title`, `summary`, `status`, `scope_id`, `navigation`
- keep response compact; do not dump raw logs

**Step 4: Run backend event-center test**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_daemon_event_center_api.py -q`

Expected: PASS.

**Step 5: Write the failing frontend API test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

globalThis.fetch = async () =>
  new Response(
    JSON.stringify({ items: [{ id: "incident-1", kind: "incident", title: "Subagent failed" }] }),
    { status: 200 },
  );

const { loadEventCenterItems } = await import("./api.ts");

void test("loadEventCenterItems reads the daemon event-center endpoint", async () => {
  const items = await loadEventCenterItems();
  assert.equal(items[0]?.kind, "incident");
});
```

**Step 6: Run frontend API test to verify it fails**

Run: `node --test frontend/src/core/event-center/api.test.ts`

Expected: FAIL because `loadEventCenterItems()` does not exist yet.

**Step 7: Write the failing route/nav contract test**

```ts
void test("workspace navigation exposes an events entry", async () => {
  const source = await readFile(
    new URL("./workspace-nav-chat-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /\/workspace\/events/);
});
```

**Step 8: Run route/nav contract test to verify it fails**

Run: `node --test frontend/src/components/workspace/event-center-routes.test.ts`

Expected: FAIL because the route is missing.

**Step 9: Implement frontend event-center API, page, route, and nav**

```ts
export interface EventCenterItem {
  id: string;
  kind: "incident" | "task" | "thread" | "channel";
  title: string;
  summary: string;
  status: string;
  navigation?: { type: string; id: string };
}
```

UI scope for first slice:
- one list
- incident badge
- scope badge
- simple “open thread / open task” button only when navigation target exists

**Step 10: Run frontend verification**

Run: `node --test frontend/src/core/event-center/api.test.ts frontend/src/components/workspace/event-center-routes.test.ts`

Expected: PASS.

Run: `pnpm --dir frontend typecheck`

Expected: PASS.

**Step 11: Commit**

```bash
git add \
  backend/app/daemon/routers/event_center.py \
  backend/app/runtime/app_factory.py \
  backend/tests/test_daemon_event_center_api.py \
  frontend/src/core/event-center \
  frontend/src/app/workspace/events/page.tsx \
  frontend/src/components/workspace/events/event-center-page.tsx \
  frontend/src/components/workspace/event-center-routes.test.ts \
  frontend/src/components/workspace/workspace-nav-chat-list.tsx \
  desktop/src/renderer/renderer-app.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts
git commit -m "feat: add event center for incidents and diagnostics"
```

### Task 3: Explicit Context Injection Planner

**Files:**
- Create: `backend/packages/harness/nion/agents/context_plan.py`
- Test: `backend/tests/test_context_plan.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/CLAUDE.md`

**Step 1: Write the failing planner test**

```python
from nion.agents.context_plan import build_context_plan


def test_build_context_plan_orders_layers_and_applies_capability_budget() -> None:
    plan = build_context_plan(
        identity="IDENTITY",
        context="CONTEXT",
        base="BASE",
        session="SESSION",
        capability_segments=[
            ("always-on-skill", "AAA", True),
            ("big-skill", "B" * 5000, False),
        ],
        capability_budget=32,
    )

    assert plan.layers == ["identity", "context", "base", "session", "capability"]
    assert "IDENTITY" in plan.rendered
    assert "CONTEXT" in plan.rendered
    assert "AAA" in plan.rendered
    assert "B" * 5000 not in plan.rendered
    assert plan.selected_capabilities == ["always-on-skill"]
```

**Step 2: Run test to verify it fails**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_context_plan.py -q`

Expected: FAIL with missing module or missing `build_context_plan`.

**Step 3: Implement the planner**

```python
from dataclasses import dataclass


@dataclass
class ContextPlan:
    layers: list[str]
    rendered: str
    selected_capabilities: list[str]
    skipped_capabilities: list[str]


def build_context_plan(..., capability_budget: int) -> ContextPlan:
    ...
```

Rules:
- preserve fixed layer order
- treat capability segments as budgeted, optional layers
- return both rendered prompt and selection metadata

**Step 4: Run planner test**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_context_plan.py -q`

Expected: PASS.

**Step 5: Integrate planner into lead-agent construction**

Minimal shape:

```python
plan = build_context_plan(
    identity=...,
    context=...,
    base=...,
    session=...,
    capability_segments=...,
    capability_budget=24000,
)
system_prompt = plan.rendered
```

Do not rewrite all prompt logic in one go.
Just isolate composition and selected/omitted capability reporting.

**Step 6: Write a regression test for lead-agent prompt assembly**

```python
def test_lead_agent_prompt_uses_context_plan_order(...):
    prompt = apply_prompt_template(...)
    assert prompt.index("<role>") < prompt.index("<clarification_system>")
```

Save in: `backend/tests/test_lead_agent_prompt.py`

**Step 7: Run backend prompt tests**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_context_plan.py tests/test_lead_agent_prompt.py -q`

Expected: PASS.

**Step 8: Update backend docs**

Document the new planner in:
- `backend/CLAUDE.md`

**Step 9: Commit**

```bash
git add \
  backend/packages/harness/nion/agents/context_plan.py \
  backend/packages/harness/nion/agents/lead_agent/agent.py \
  backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/tests/test_context_plan.py \
  backend/tests/test_lead_agent_prompt.py \
  backend/CLAUDE.md
git commit -m "feat: add explicit context injection planner"
```

### Task 4: Task-Aware Automation Pipeline

**Files:**
- Modify: `backend/packages/harness/nion/automation/models.py`
- Modify: `backend/packages/harness/nion/automation/service.py`
- Modify: `backend/packages/harness/nion/automation/executor.py`
- Modify: `backend/app/gateway/routers/automation.py`
- Test: `backend/tests/test_automation_task_delivery.py`
- Modify: `frontend/src/core/automation/types.ts`
- Modify: `frontend/src/core/automation/api.ts`
- Modify: `frontend/src/core/automation/draft-builder.ts`
- Test: `frontend/src/core/automation/draft-builder.test.ts`
- Modify: `frontend/src/components/workspace/automation/scheduled-task-form.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-page.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

**Step 1: Write the failing backend automation test**

```python
def test_run_job_creates_task_when_delivery_mode_is_task(tmp_path) -> None:
    service = build_test_automation_service(tmp_path)
    job = service.create_job(
        {
            "name": "Weekly review",
            "prompt": "Summarize this week and prepare follow-up work",
            "job_kind": "scheduled_task",
            "schedule_kind": "cron",
            "schedule_value": "0 9 * * 1",
            "delivery_mode": "task",
        }
    )

    run = service.run_job(job.id)

    assert run.status == "succeeded"
    assert run.delivery_results[0]["task_id"]
```

**Step 2: Run backend automation test to verify it fails**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_automation_task_delivery.py -q`

Expected: FAIL because `delivery_mode="task"` is unsupported.

**Step 3: Extend automation models minimally**

```python
AutomationDeliveryMode = Literal["local", "thread", "channel", "multi", "task"]
```

Add the smallest possible execution payload needed to create a `TaskRecord`.

**Step 4: Implement task delivery in automation service/executor**

Rules:
- scheduled task with `delivery_mode="task"` creates or updates a durable task object
- do not auto-start a thread in v1
- return `task_id` inside `delivery_results`
- write a compact `result_summary`

**Step 5: Run backend automation test**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_automation_task_delivery.py -q`

Expected: PASS.

**Step 6: Extend the frontend draft-builder test first**

```ts
void test("builds a scheduled task request that targets the task center", () => {
  const draft = buildAutomationDraftRequest({
    kind: "scheduled_task",
    name: "Weekly review",
    prompt: "Summarize the week",
    cadence: "weekly",
    timeOfDay: "09:30",
    timezone: "UTC",
    dayOfWeek: 1,
    deliveryMode: "task",
  });

  assert.equal(draft.delivery_mode, "task");
});
```

**Step 7: Run frontend test to verify it fails**

Run: `node --test frontend/src/core/automation/draft-builder.test.ts`

Expected: FAIL because `"task"` is not allowed yet.

**Step 8: Implement frontend support**

Minimal UI scope:
- add `task` as a delivery mode in `types.ts`
- allow the form to choose it
- send it through `draft-builder.ts` and `api.ts`
- show a short hint like “Create a durable task instead of running immediately”

**Step 9: Run frontend automation verification**

Run: `node --test frontend/src/core/automation/draft-builder.test.ts`

Expected: PASS.

Run: `pnpm --dir frontend typecheck`

Expected: PASS.

**Step 10: Commit**

```bash
git add \
  backend/packages/harness/nion/automation/models.py \
  backend/packages/harness/nion/automation/service.py \
  backend/packages/harness/nion/automation/executor.py \
  backend/app/gateway/routers/automation.py \
  backend/tests/test_automation_task_delivery.py \
  frontend/src/core/automation/types.ts \
  frontend/src/core/automation/api.ts \
  frontend/src/core/automation/draft-builder.ts \
  frontend/src/core/automation/draft-builder.test.ts \
  frontend/src/components/workspace/automation/scheduled-task-form.tsx \
  frontend/src/components/workspace/automation/automation-page.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts
git commit -m "feat: let automation create durable tasks"
```

### Task 5: Delegated Task Lifecycle Visualization

**Files:**
- Create: `frontend/src/core/tasks/lifecycle.ts`
- Test: `frontend/src/core/tasks/lifecycle.test.ts`
- Modify: `frontend/src/core/tasks/types.ts`
- Modify: `frontend/src/core/tasks/context.tsx`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/subtask-card.tsx`
- Test: `frontend/src/components/workspace/messages/subtask-card.contract.test.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

**Step 1: Write the failing lifecycle reducer test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

const { deriveDelegatedTaskPhase } = await import("./lifecycle.ts");

void test("successful tool result stays in awaiting_parent until parent turn finishes", () => {
  const phase = deriveDelegatedTaskPhase({
    toolResultStatus: "success",
    streamClosed: false,
  });

  assert.equal(phase, "awaiting_parent");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test frontend/src/core/tasks/lifecycle.test.ts`

Expected: FAIL because `deriveDelegatedTaskPhase()` does not exist.

**Step 3: Implement the reducer**

```ts
export type DelegatedTaskPhase =
  | "queued"
  | "running"
  | "awaiting_parent"
  | "completed"
  | "failed";

export function deriveDelegatedTaskPhase(input: {
  toolResultStatus?: "success" | "failure";
  streamClosed: boolean;
}): DelegatedTaskPhase {
  ...
}
```

**Step 4: Extend `Subtask` state shape minimally**

```ts
export interface Subtask {
  id: string;
  status: "in_progress" | "completed" | "failed";
  phase?: DelegatedTaskPhase;
  ...
}
```

Do not rename `core/tasks` in this pass. Keep the diff small.

**Step 5: Wire lifecycle updates into the thread/message flow**

Update:
- `frontend/src/core/threads/hooks.ts`
- `frontend/src/components/workspace/messages/message-list.tsx`

Rules:
- when a `task` tool call appears, set `phase="queued"`
- when streaming updates arrive, set `phase="running"`
- when the tool result says success but the parent stream is still open, set `phase="awaiting_parent"`
- only mark `phase="completed"` after the turn closes

**Step 6: Write the failing card contract test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("subtask card renders an awaiting-parent phase label", async () => {
  const source = await readFile(
    new URL("./subtask-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /awaiting_parent/);
});
```

**Step 7: Run the card contract test to verify it fails**

Run: `node --test frontend/src/components/workspace/messages/subtask-card.contract.test.ts`

Expected: FAIL because the new phase is not rendered yet.

**Step 8: Implement the card UI**

Update `subtask-card.tsx` to:
- render phase-specific copy
- treat `awaiting_parent` as distinct from `completed`
- keep existing result rendering for success/failure

**Step 9: Run lifecycle UI verification**

Run: `node --test frontend/src/core/tasks/lifecycle.test.ts frontend/src/components/workspace/messages/subtask-card.contract.test.ts`

Expected: PASS.

Run: `pnpm --dir frontend typecheck`

Expected: PASS.

**Step 10: Commit**

```bash
git add \
  frontend/src/core/tasks/lifecycle.ts \
  frontend/src/core/tasks/lifecycle.test.ts \
  frontend/src/core/tasks/types.ts \
  frontend/src/core/tasks/context.tsx \
  frontend/src/core/threads/hooks.ts \
  frontend/src/components/workspace/messages/message-list.tsx \
  frontend/src/components/workspace/messages/subtask-card.tsx \
  frontend/src/components/workspace/messages/subtask-card.contract.test.ts \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts
git commit -m "feat: show delegated task lifecycle phases"
```

## Final Verification

After Task 5, run the full focused verification set:

```bash
cd backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_task_service.py \
  tests/test_tasks_router.py \
  tests/test_daemon_event_center_api.py \
  tests/test_context_plan.py \
  tests/test_lead_agent_prompt.py \
  tests/test_automation_task_delivery.py -q
```

Expected: PASS.

```bash
node --test \
  frontend/src/components/workspace/task-center-routes.test.ts \
  frontend/src/core/event-center/api.test.ts \
  frontend/src/components/workspace/event-center-routes.test.ts \
  frontend/src/core/automation/draft-builder.test.ts \
  frontend/src/core/tasks/lifecycle.test.ts \
  frontend/src/components/workspace/messages/subtask-card.contract.test.ts
```

Expected: PASS.

```bash
pnpm --dir frontend typecheck
```

Expected: PASS.

```bash
cd backend && uvx ruff check .
```

Expected: PASS.
