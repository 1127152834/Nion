# Remove Event Task And Hook Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove event task, event center, event-driven dispatch, event-task drafts, and hook package/script support completely, leaving Automation with only overview, reminders, scheduled tasks, and run history.

**Architecture:** Treat the current hook line as fully out of scope. Delete event-task frontend tabs/forms/detail pages/event-center pages, remove event-task APIs and backend service branches, delete event dispatch plumbing from threads/client/tooling, and narrow the automation model back to reminder + scheduled task only.

**Tech Stack:** FastAPI, Pydantic, React 19, Next.js App Router, TypeScript, TanStack Query, pytest, Node contract tests, Ruff, ESLint

---

## File Structure And Ownership

### Frontend files to modify
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-kind-tabs.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-job-section.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/hooks.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/presentation.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/utils.ts`

### Frontend files to delete
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/automation/[job_id]/page.tsx`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/automation/events/[event_id]/page.tsx`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/event-task-form.tsx`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/event-task-detail-page.tsx`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/event-task-draft-card.tsx`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-event-center-section.tsx`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-event-detail-page.tsx`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/event-task-builder.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/event-presentation.ts`
- Delete if no longer needed: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/runtime-effects.ts`

### Frontend tests to delete or rewrite
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/event-task-list.contract.test.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/event-task-form.contract.test.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/event-task-detail.contract.test.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/event-task-draft-card.contract.test.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-event-center.contract.test.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-event-detail.contract.test.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/event-center-api.test.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/event-presentation.test.ts`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/event-task-builder.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-job-section.contract.test.ts`
  - Narrow to reminder + scheduled task behavior only.

### Backend files to modify
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/automation.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/repository.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/executor.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/__init__.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/automation_tool.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/tools.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/threads.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`

### Backend files to delete
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/event_dispatch.py`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/packages.py`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/script_runner.py`

### Backend tests to delete or rewrite
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_events_router.py`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_event_task_dispatch.py`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_event_task_builtin_actions.py`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_event_task_script_actions.py`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_packages.py`
- Delete: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_runtime_events.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_router.py`
  - Remove event-task route coverage and assert those routes are absent.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_repository.py`
  - Narrow to reminder + scheduled_task persistence only.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_tool.py`
  - Remove create/draft event-task coverage, or delete the tool entirely if no longer needed.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_client.py`
  - Remove automation event-dispatch expectations if they only exist for event-task hooks.

### Docs to modify
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/07-automation/README.md`
  - Rewrite to reminder + scheduled_task only.

---

## Execution Order

1. Delete frontend event-task/event-center UI and tests.
2. Narrow frontend automation client/types/presentation to reminders + scheduled tasks.
3. Delete backend event-task APIs, package support, dispatch plumbing, and tests.
4. Remove cross-cutting automation dispatch from `threads.py`, `client.py`, and message rendering.
5. Rewrite automation test doc and run final focused verification.
