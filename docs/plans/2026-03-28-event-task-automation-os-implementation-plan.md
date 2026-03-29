# Event Task Automation OS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the first working slice of Nion's event-task automation line: backend rule support, hook package directories, frontend event-task UI, and end-to-end creation / execution / deletion coverage.

**Architecture:** Extend the existing automation domain instead of creating a parallel hooks subsystem. Model event tasks as a third automation job kind with an event trigger contract and optional package directory under the automation domain. Reuse the existing automation repository, router, history, and frontend automation surfaces, then add a new detail page and package-backed action model for self-contained hook packages.

**Tech Stack:** FastAPI, Pydantic, SQLite, Python pathlib/shutil, React 19, Next.js App Router, TypeScript, TanStack Query, node:test source-contract tests, pytest, Playwright end-to-end verification

---

### Task 1: Add the Failing Backend Contract Tests

**Files:**
- Modify: `backend/tests/test_automation_router.py`
- Modify: `backend/tests/test_automation_repository.py`
- Modify: `backend/tests/test_automation_service.py` if created
- Modify: `backend/tests/test_automation_tool.py`
- Create: `backend/tests/test_hook_packages.py`

**Step 1: Write the failing tests**

Add tests for:

- automation router accepts `job_kind="event_task"`
- event tasks can be created with `trigger_kind="event"`
- event task deletion removes its package directory
- automation tool can create an event task payload
- package directory is created only when package files are requested

**Step 2: Run tests to verify they fail**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_automation_router.py tests/test_automation_tool.py tests/test_hook_packages.py -q`
Expected: FAIL because event-task fields and package deletion behavior do not exist yet

**Step 3: Commit nothing**

This task is red-only.

### Task 2: Extend Backend Automation Models and Paths

**Files:**
- Modify: `backend/packages/harness/nion/automation/models.py`
- Modify: `backend/packages/harness/nion/config/paths.py`
- Modify: `backend/packages/harness/nion/automation/service.py`
- Create: `backend/packages/harness/nion/automation/packages.py`

**Step 1: Implement minimal model extensions**

Add fields needed for event tasks:

- `job_kind="event_task"`
- `trigger_kind`
- `trigger_spec`
- `action_kind`
- `action_spec`
- `package_dir`
- `package_manifest`

Keep backward compatibility for reminders and scheduled tasks.

**Step 2: Add path helpers**

Add automation-domain helpers in `Paths`:

- automation root dir
- automation hooks dir
- hook package dir by hook id

**Step 3: Add package helper module**

Create helper functions for:

- creating hook package directory
- writing provided files into it
- deleting a package directory

**Step 4: Run focused tests**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_hook_packages.py -q`
Expected: PASS

### Task 3: Support Event Task CRUD in Backend Service and Router

**Files:**
- Modify: `backend/app/gateway/routers/automation.py`
- Modify: `backend/packages/harness/nion/automation/service.py`
- Modify: `backend/packages/harness/nion/automation/repository.py`
- Modify: `backend/packages/harness/nion/automation/models.py`

**Step 1: Implement create/read/delete support**

Extend create payloads and response models so event tasks round-trip through the existing automation API.

**Step 2: Add delete cleanup**

When deleting an event task, remove its package directory if present.

**Step 3: Run router and repository tests**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_automation_router.py tests/test_automation_repository.py tests/test_hook_packages.py -q`
Expected: PASS

### Task 4: Add Event Trigger Execution Support

**Files:**
- Create: `backend/packages/harness/nion/automation/event_bus.py`
- Create: `backend/packages/harness/nion/automation/event_dispatch.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/packages/harness/nion/automation/service.py`
- Modify: `backend/packages/harness/nion/automation/executor.py`
- Create: `backend/tests/test_event_task_dispatch.py`

**Step 1: Write the failing dispatch test**

Test that:

- recording a supported thread/agent event dispatches matching event tasks
- event task execution creates a run history entry
- unsupported events do not dispatch

**Step 2: Run the test and verify red**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_event_task_dispatch.py -q`
Expected: FAIL because no event dispatch integration exists

**Step 3: Implement minimal event dispatch**

Use existing thread and agent event recording points to also notify an in-process event dispatcher. Support a first event catalog:

- `thread.started`
- `thread.finished`
- `thread.failed`
- `agent.run.completed`
- `agent.run.failed`

For event tasks with `action_kind="agent_prompt"`, reuse the existing automation executor.

**Step 4: Run dispatch tests**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_event_task_dispatch.py -q`
Expected: PASS

### Task 5: Add Package-Backed Script Action for Sound and Local Scripts

**Files:**
- Modify: `backend/packages/harness/nion/automation/executor.py`
- Modify: `backend/packages/harness/nion/automation/models.py`
- Create: `backend/packages/harness/nion/automation/script_runner.py`
- Create: `backend/tests/test_event_task_script_actions.py`

**Step 1: Write failing tests**

Cover:

- script action resolves package-local entry file
- missing script path fails run cleanly
- packaged file path is accessible to the action context

**Step 2: Run test to verify red**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_event_task_script_actions.py -q`
Expected: FAIL

**Step 3: Implement minimal runner**

Implement safe execution for package-local scripts only. Restrict entry points to the package directory. The first slice only needs enough support for package-backed scripts to execute and report status.

**Step 4: Run script tests**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_event_task_script_actions.py -q`
Expected: PASS

### Task 6: Add Frontend Event Task Data Model and API Tests

**Files:**
- Modify: `frontend/src/core/automation/types.ts`
- Modify: `frontend/src/core/automation/api.ts`
- Modify: `frontend/src/core/automation/hooks.ts`
- Create: `frontend/src/core/automation/event-task-api.test.ts`

**Step 1: Write failing frontend API tests**

Cover:

- event task create payload shape
- event task list parsing
- package fields round-trip

**Step 2: Run tests to verify red**

Run: `pnpm --dir frontend exec node --test src/core/automation/event-task-api.test.ts`
Expected: FAIL

**Step 3: Implement minimal type and API changes**

Add:

- event task types
- trigger/action fields
- package metadata fields

**Step 4: Run tests**

Run: `pnpm --dir frontend exec node --test src/core/automation/event-task-api.test.ts`
Expected: PASS

### Task 7: Add Event Task Tab and List UI

**Files:**
- Modify: `frontend/src/components/workspace/automation/automation-kind-tabs.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-page.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-job-section.tsx`
- Modify: `frontend/src/core/automation/presentation.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Create: `frontend/src/components/workspace/automation/event-task-form.tsx`
- Create: `frontend/src/components/workspace/automation/event-task-list.contract.test.ts`

**Step 1: Write the failing source-contract test**

Assert the automation UI now contains:

- `events` tab
- event-task form/component references
- event-task grouping / labels

**Step 2: Run test to verify red**

Run: `pnpm --dir frontend exec node --test src/components/workspace/automation/event-task-list.contract.test.ts`
Expected: FAIL

**Step 3: Implement minimal UI**

Add:

- new tab
- simple event-task creation form for built-in cases
- list section for event tasks

**Step 4: Run test**

Run: `pnpm --dir frontend exec node --test src/components/workspace/automation/event-task-list.contract.test.ts`
Expected: PASS

### Task 8: Add Event Task Detail Page and Package Directory View

**Files:**
- Create: `frontend/src/app/workspace/automation/[job_id]/page.tsx`
- Create: `frontend/src/components/workspace/automation/event-task-detail-page.tsx`
- Create: `frontend/src/components/workspace/automation/event-task-package-panel.tsx`
- Create: `frontend/src/components/workspace/automation/event-task-detail.contract.test.ts`
- Modify: `frontend/src/core/automation/api.ts`

**Step 1: Write the failing contract test**

Assert the detail page source includes:

- trigger summary
- action summary
- package directory panel
- test/log area

**Step 2: Run test to verify red**

Run: `pnpm --dir frontend exec node --test src/components/workspace/automation/event-task-detail.contract.test.ts`
Expected: FAIL

**Step 3: Implement minimal detail page**

The first slice should show:

- name and enabled state
- trigger summary
- action summary
- package path
- file list from package manifest
- recent run summaries

**Step 4: Run test**

Run: `pnpm --dir frontend exec node --test src/components/workspace/automation/event-task-detail.contract.test.ts`
Expected: PASS

### Task 9: Expose Automation Tool to the Agent and Support Event Task Creation

**Files:**
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Modify: `backend/packages/harness/nion/tools/builtins/automation_tool.py`
- Modify: `backend/tests/test_automation_tool.py`

**Step 1: Write the failing tool test**

Add a test for:

- `automation` tool is available in builtin exports
- it accepts `event_task` create payload fields

**Step 2: Run test to verify red**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_automation_tool.py -q`
Expected: FAIL

**Step 3: Implement minimal support**

Expose the tool and extend its create action to support event tasks and package-backed payloads.

**Step 4: Run test**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_automation_tool.py -q`
Expected: PASS

### Task 10: Run Focused Full-Slice Verification

**Files:**
- Modify only if verification exposes issues in touched files above

**Step 1: Run backend focused suite**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_automation_router.py tests/test_automation_repository.py tests/test_automation_tool.py tests/test_hook_packages.py tests/test_event_task_dispatch.py tests/test_event_task_script_actions.py -q`
Expected: PASS

**Step 2: Run frontend focused suite**

Run: `pnpm --dir frontend exec node --test src/core/automation/event-task-api.test.ts src/components/workspace/automation/event-task-list.contract.test.ts src/components/workspace/automation/event-task-detail.contract.test.ts`
Expected: PASS

**Step 3: Run frontend static checks**

Run: `pnpm --dir frontend check`
Expected: PASS

**Step 4: Run backend static checks**

Run: `cd backend && UV_LINK_MODE=copy uv run pytest tests/test_automation_router.py -q`
Expected: PASS

**Step 5: Run end-to-end browser verification**

Run the local app, then verify:

- event task tab renders
- event task can be created
- detail page opens
- delete removes task

Use Playwright or browser automation and capture evidence.

**Step 6: Review for patch-on-patch drift**

Inspect whether event tasks introduced duplicate grouping, duplicated schedule/event logic, or awkward special cases. If yes, refactor before concluding.
