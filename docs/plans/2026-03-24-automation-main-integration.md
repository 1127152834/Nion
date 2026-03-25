# Automation Main Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate the automation runtime into `main` without pulling in the OpenViking / companion-runtime lane, while adapting the frontend settings surface to the current `main` styling and i18n structure.

**Architecture:** Treat `codex/automation-runtime-lane` as the backend source of truth for the automation domain modules, then apply the merge-only fixes validated in `tmp/companion-automation-merge` for gateway wiring, nginx routing, executor thread creation, and frontend settings integration. Do not import any `openviking`, `recall`, or `relationships` files from the temporary merge branch for this task.

**Tech Stack:** FastAPI, LangGraph SDK, SQLite, Next.js, React, TanStack Query, existing Nion settings dialog + i18n locale system

---

## Pre-Read

Reference branches / commits:

- `codex/automation-runtime-lane` at `9a7100d`
- `tmp/companion-automation-merge` at `64e842a`

Important constraint:

- Only automation should be integrated to `main`
- Do **not** bring the companion/OpenViking lane into `main` as part of this work

## Task 1: Create an Isolated Main Integration Worktree

**Files:**
- Create: new worktree only
- Verify: current branch state only

**Step 1: Create a dedicated worktree from `main`**

Run:

```bash
git worktree add ~/.config/superpowers/worktrees/nion/automation-main-integration -b integrate/automation-main main
```

**Step 2: Enter the worktree and confirm the branch is clean**

Run:

```bash
cd ~/.config/superpowers/worktrees/nion/automation-main-integration
git status --short
```

Expected: no tracked changes

**Step 3: Capture the source references before editing**

Run:

```bash
git diff --name-status main..codex/automation-runtime-lane
git diff --name-status codex/automation-runtime-lane..tmp/companion-automation-merge
```

Expected: first diff shows automation domain files; second diff shows only merge-fix deltas such as executor, nginx, settings dialog, and i18n

**Step 4: Commit nothing**

This task is setup only.

---

## Task 2: Import Backend Automation Modules and Wire the Gateway

**Files:**
- Create:
  - `backend/app/gateway/routers/automation.py`
  - `backend/packages/harness/nion/automation/__init__.py`
  - `backend/packages/harness/nion/automation/delivery.py`
  - `backend/packages/harness/nion/automation/executor.py`
  - `backend/packages/harness/nion/automation/models.py`
  - `backend/packages/harness/nion/automation/policies.py`
  - `backend/packages/harness/nion/automation/repository.py`
  - `backend/packages/harness/nion/automation/scheduler.py`
  - `backend/packages/harness/nion/automation/service.py`
  - `backend/packages/harness/nion/config/automation_config.py`
  - `backend/packages/harness/nion/tools/builtins/automation_tool.py`
  - `backend/tests/test_automation_delivery.py`
  - `backend/tests/test_automation_executor.py`
  - `backend/tests/test_automation_governance.py`
  - `backend/tests/test_automation_repository.py`
  - `backend/tests/test_automation_router.py`
  - `backend/tests/test_automation_scheduler.py`
  - `backend/tests/test_automation_tool.py`
- Modify:
  - `backend/app/gateway/app.py`
  - `backend/app/gateway/routers/__init__.py`
  - `backend/README.md`
  - `backend/CLAUDE.md`
  - `README.md`

**Step 1: Write the failing gateway registration test**

In `backend/tests/test_automation_router.py`, add this exact test if it is not already present:

```python
from app.gateway.app import create_app


def test_gateway_registers_automation_status_route() -> None:
    app = create_app()
    routes = {route.path for route in app.routes}
    assert "/api/automation/status" in routes
```

**Step 2: Run the failing test on `main`**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run --python /opt/homebrew/bin/python3.13 pytest tests/test_automation_router.py::test_gateway_registers_automation_status_route -q
```

Expected: `FAIL`

**Step 3: Import the backend automation domain files from the automation lane**

Run:

```bash
git checkout codex/automation-runtime-lane -- \
  backend/app/gateway/routers/automation.py \
  backend/packages/harness/nion/automation \
  backend/packages/harness/nion/config/automation_config.py \
  backend/packages/harness/nion/tools/builtins/automation_tool.py \
  backend/tests/test_automation_delivery.py \
  backend/tests/test_automation_executor.py \
  backend/tests/test_automation_governance.py \
  backend/tests/test_automation_repository.py \
  backend/tests/test_automation_router.py \
  backend/tests/test_automation_scheduler.py \
  backend/tests/test_automation_tool.py \
  backend/README.md \
  backend/CLAUDE.md \
  README.md
```

**Step 4: Wire the automation router into the gateway explicitly**

Update `backend/app/gateway/routers/__init__.py` to export `automation` alongside the existing router modules.

Update `backend/app/gateway/app.py` so it:

- imports `automation` from `app.gateway.routers`
- adds an `openapi_tags` entry for `"automation"`
- calls `app.include_router(automation.router)`

The import block should include:

```python
from app.gateway.routers import (
    agents,
    artifacts,
    automation,
    channels,
    mcp,
    memory,
    models,
    skills,
    suggestions,
    uploads,
)
```

And the router section must include:

```python
# Automation API is mounted at /api/automation
app.include_router(automation.router)
```

**Step 5: Run targeted backend tests**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run --python /opt/homebrew/bin/python3.13 pytest \
  tests/test_automation_repository.py \
  tests/test_automation_router.py \
  tests/test_automation_tool.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add backend/app/gateway/routers/automation.py \
  backend/app/gateway/app.py \
  backend/app/gateway/routers/__init__.py \
  backend/packages/harness/nion/automation \
  backend/packages/harness/nion/config/automation_config.py \
  backend/packages/harness/nion/tools/builtins/automation_tool.py \
  backend/tests/test_automation_delivery.py \
  backend/tests/test_automation_executor.py \
  backend/tests/test_automation_governance.py \
  backend/tests/test_automation_repository.py \
  backend/tests/test_automation_router.py \
  backend/tests/test_automation_scheduler.py \
  backend/tests/test_automation_tool.py \
  backend/README.md backend/CLAUDE.md README.md
git commit -m "Integrate the automation runtime into the backend gateway"
```

---

## Task 3: Apply Backend Integration Fixes Proven in Merge QA

**Files:**
- Modify:
  - `backend/packages/harness/nion/automation/executor.py`
  - `backend/tests/test_automation_executor.py`
  - `docker/nginx/nginx.conf`
  - `docker/nginx/nginx.local.conf`

**Step 1: Write the failing executor regression test**

Add this exact test to `backend/tests/test_automation_executor.py` if it is not already present:

```python
def test_langgraph_runner_creates_missing_thread(monkeypatch):
    captured = {}

    class DummyRuns:
        def wait(self, thread_id, assistant_id, **kwargs):
            captured["thread_id"] = thread_id
            captured["assistant_id"] = assistant_id
            captured["kwargs"] = kwargs
            return {"messages": [{"type": "ai", "content": "Done"}]}

    class DummyClient:
        def __init__(self):
            self.runs = DummyRuns()

    monkeypatch.setattr("nion.automation.executor.get_sync_client", lambda url: DummyClient())

    runner = LangGraphAutomationRunner(langgraph_url="http://localhost:2024")
    output = runner.run(
        prompt="Summarize updates",
        thread_id="01234567-89ab-cdef-0123-456789abcdef",
        context={"session_mode": "automation"},
        config={"recursion_limit": 100},
    )

    assert output.response_text == "Done"
    assert captured["kwargs"]["if_not_exists"] == "create"
```

**Step 2: Run it to verify it fails before the fix**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run --python /opt/homebrew/bin/python3.13 pytest tests/test_automation_executor.py::test_langgraph_runner_creates_missing_thread -q
```

Expected: `FAIL`

**Step 3: Patch the automation executor**

In `backend/packages/harness/nion/automation/executor.py`:

- change `isolated_thread_id` generation to a UUID string
- pass `if_not_exists="create"` into `self.client.runs.wait(...)`

The `LangGraphAutomationRunner.run()` call should include:

```python
result = self.client.runs.wait(
    thread_id,
    self._assistant_id,
    input={"messages": [{"role": "human", "content": prompt}]},
    config=config,
    context=context,
    if_not_exists="create",
)
```

And `AutomationExecutor.execute_job()` should generate:

```python
isolated_thread_id = str(uuid4())
```

**Step 4: Patch nginx so the new APIs route to the gateway**

In both `docker/nginx/nginx.conf` and `docker/nginx/nginx.local.conf`, add `location` blocks for:

- `/api/automation`
- `/api/recall`
- `/api/openviking`

Each block should match the existing `/api/memory` proxy style:

```nginx
location /api/automation {
    proxy_pass http://gateway;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Step 5: Run targeted verification**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run --python /opt/homebrew/bin/python3.13 pytest \
  tests/test_automation_executor.py \
  tests/test_automation_router.py \
  tests/test_automation_tool.py -q
```

Expected: `PASS`

**Step 6: Commit**

```bash
git add backend/packages/harness/nion/automation/executor.py \
  backend/tests/test_automation_executor.py \
  docker/nginx/nginx.conf \
  docker/nginx/nginx.local.conf
git commit -m "Stabilize automation execution and API proxying on main"
```

---

## Task 4: Add Frontend Automation Data Layer

**Files:**
- Create:
  - `frontend/src/core/automation/api.ts`
  - `frontend/src/core/automation/hooks.ts`
  - `frontend/src/core/automation/types.ts`

**Step 1: Import the frontend automation core files from the automation lane**

Run:

```bash
git checkout codex/automation-runtime-lane -- \
  frontend/src/core/automation/api.ts \
  frontend/src/core/automation/hooks.ts \
  frontend/src/core/automation/types.ts
```

**Step 2: Run frontend typecheck to confirm the new data layer compiles**

Run:

```bash
pnpm -C frontend typecheck
```

Expected: `PASS`

**Step 3: Commit**

```bash
git add frontend/src/core/automation/api.ts \
  frontend/src/core/automation/hooks.ts \
  frontend/src/core/automation/types.ts
git commit -m "Add the frontend automation data layer"
```

---

## Task 5: Integrate Automation into the Current Main Settings UI

**Files:**
- Create:
  - `frontend/src/components/workspace/settings/automation-settings-page.tsx`
- Modify:
  - `frontend/src/components/workspace/settings/settings-dialog.tsx`
  - `frontend/src/core/i18n/locales/en-US.ts`
  - `frontend/src/core/i18n/locales/zh-CN.ts`
  - `frontend/src/core/i18n/locales/types.ts`

**Step 1: Do not blindly copy the old frontend page**

Use `tmp/companion-automation-merge` as a reference, not as a direct frontend merge source.

Read these reference files:

```bash
sed -n '1,320p' ~/.config/superpowers/worktrees/nion/tmp-companion-automation-merge/frontend/src/components/workspace/settings/automation-settings-page.tsx
sed -n '1,260p' frontend/src/components/workspace/settings/settings-dialog.tsx
sed -n '552,760p' frontend/src/core/i18n/locales/zh-CN.ts
sed -n '580,780p' frontend/src/core/i18n/locales/en-US.ts
```

**Step 2: Add the i18n schema first**

Extend `frontend/src/core/i18n/locales/types.ts` with:

- `settings.sections.automation`
- `settings.automation.*`

Include strings for:

- scheduler / jobs / runs
- diagnostics / future hooks
- create job form
- schedule help
- empty states
- action buttons
- state labels

**Step 3: Fill both locale files**

Add matching automation copy to:

- `frontend/src/core/i18n/locales/en-US.ts`
- `frontend/src/core/i18n/locales/zh-CN.ts`

Use the current page labels from the validated merge branch as content seeds, but localize them properly.

**Step 4: Create the automation settings page adapted to the current main style**

Build `frontend/src/components/workspace/settings/automation-settings-page.tsx` using the existing `SettingsSection`, `Button`, `Input`, `Textarea`, `Select`, `Item`, and `Badge` patterns already used in `main`.

Requirements:

- all user-facing strings come from `t.settings.automation`
- keep the existing main dialog layout intact
- preserve labels / ids / names for form accessibility
- avoid `<p><div /></p>` nesting; use plain `div` containers in job cards

**Step 5: Add the section to the settings dialog**

In `frontend/src/components/workspace/settings/settings-dialog.tsx`:

- add `"automation"` to the `SettingsSection` union
- import `BotIcon`
- import `AutomationSettingsPage`
- add a new section entry using `t.settings.sections.automation`
- render `<AutomationSettingsPage />` when the active section is `"automation"`

**Step 6: Run frontend checks**

Run:

```bash
pnpm -C frontend typecheck
pnpm -C frontend lint
```

Expected: `PASS`

**Step 7: Commit**

```bash
git add frontend/src/components/workspace/settings/automation-settings-page.tsx \
  frontend/src/components/workspace/settings/settings-dialog.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts
git commit -m "Integrate automation into the current main settings experience"
```

---

## Task 6: Full Main-Integration Verification

**Files:**
- Verify only

**Step 1: Run backend full regression**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run --python /opt/homebrew/bin/python3.13 pytest -q
```

Expected: `PASS`

**Step 2: Run frontend static verification**

Run:

```bash
cd ..
pnpm -C frontend typecheck
pnpm -C frontend lint
BETTER_AUTH_SECRET=0123456789abcdef0123456789abcdef pnpm -C frontend build
```

Expected: `PASS`

**Step 3: Start the integrated app**

Run:

```bash
NION_CONFIG_PATH=/Users/zhangtiancheng/Documents/项目/agent/nion/config.yaml \
BETTER_AUTH_SECRET=0123456789abcdef0123456789abcdef \
BETTER_AUTH_BASE_URL=http://localhost:2026 \
make dev
```

Expected:

- `http://localhost:2026` serves the app
- `http://localhost:2026/health` returns `{"status":"healthy","service":"nion-gateway"}`
- `http://localhost:2026/api/automation/status` returns JSON, not a Next.js 404 page

**Step 4: Manual smoke test**

Verify:

1. Open `http://localhost:2026/workspace`
2. Open Settings
3. Confirm the automation tab appears in the left nav
4. Open the automation tab
5. Create an automation job
6. Click `Run now`
7. Confirm the job list updates and recent runs show a new run

**Step 5: Final commit**

```bash
git add -A
git commit -m "Finish automation integration on top of main"
```

---

## Important Non-Goals

Do **not** import these from `tmp/companion-automation-merge`:

- `backend/packages/harness/nion/openviking/*`
- `backend/packages/harness/nion/recall/*`
- `backend/packages/harness/nion/relationships/*`
- `backend/app/gateway/routers/openviking.py`
- `backend/app/gateway/routers/recall.py`
- `backend/app/gateway/routers/relationships.py`
- `backend/packages/harness/nion/agents/lead_agent/agent.py` OpenViking/continuity changes
- `backend/packages/harness/nion/agents/lead_agent/prompt.py` relationship/continuity changes

Those belong to the companion/OpenViking lane, not the automation-main integration.

## Final Verification Checklist

- Automation backend routes are registered in the gateway
- nginx proxies `/api/automation`
- Automation runs create missing LangGraph threads instead of failing on first run
- Automation settings page is visible in the current `main` settings UI
- Automation page copy is localized in both Chinese and English
- Backend full test suite passes
- Frontend typecheck/lint/build pass
- Manual automation create/run smoke passes
