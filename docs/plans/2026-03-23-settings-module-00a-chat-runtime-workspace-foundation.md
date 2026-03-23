# Chat Runtime & Workspace Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the donor chat runtime, composer, working-directory, and workspace semantics so the settings migration aligns real product behavior instead of stopping at page-level configuration.

**Architecture:** After Module 00 lands the Config Center backbone, add a thread-scoped runtime profile layer, a single app-workspace model, and the donor chat-page interaction contract. Distinguish three concepts explicitly: the app workspace rooted at `~/.nion-data/workspace`, the per-thread sandbox workdir under `{base_dir}/threads/{thread_id}/user-data/workdir`, and an optional host-directory binding used only when a conversation explicitly targets a server/desktop path. In web deployments, host mode means backend-host execution and does not require selecting a workdir up front; outputs still default to thread sandbox storage unless the task explicitly targets a host directory.

**Tech Stack:** FastAPI, Pydantic, React, TanStack Query, thread runtime services, artifacts/workbench hooks

---

**Dependency:** Module 00 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 01.

### Task 1: Normalize Data Roots And Workspace Semantics

**Files:**
- Modify: `backend/packages/harness/deerflow/config/paths.py`
- Modify: `backend/packages/harness/deerflow/agents/middlewares/thread_data_middleware.py`
- Modify: `backend/app/gateway/path_utils.py`
- Test: `backend/tests/test_paths_data_root.py`
- Test: `backend/tests/test_thread_data_paths.py`

Steps:

1. Change the current repo's default data root to `~/.nion-data` instead of `~/.nion` or `.deer-flow`.
2. Add explicit helpers/docs for:
   - app workspace root: `~/.nion-data/workspace`
   - thread sandbox workdir: `{base_dir}/threads/{thread_id}/user-data/workdir`
   - optional host-bound directory: runtime-profile override only when explicitly selected or requested
3. Keep backward-compatible resolution for legacy `user-data/workspace` directories so existing threads do not break.

### Task 2: Add Thread Runtime Profile APIs For Web And Desktop

**Files:**
- Create: `backend/app/gateway/routers/runtime_profile.py`
- Create: `backend/packages/harness/deerflow/runtime_profile/__init__.py`
- Create: `backend/packages/harness/deerflow/runtime_profile/repository.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/gateway/path_utils.py`
- Modify: `backend/app/gateway/routers/uploads.py`
- Modify: `backend/app/gateway/routers/artifacts.py`
- Test: `backend/tests/test_runtime_profile_repository.py`
- Test: `backend/tests/test_runtime_profile_api.py`

Steps:

1. Persist per-thread `execution_mode`, optional `host_workdir`, `locked`, and `updated_at`.
2. Implement web semantics:
   - `execution_mode=host` means backend/server host execution is allowed
   - a bound host directory is optional
   - thread outputs still default to sandbox storage when no explicit host directory is targeted
3. Implement desktop semantics:
   - keep donor-style directory binding flow when a desktop picker exists
   - once a host directory is actually bound and used, lock the binding for that thread
4. Only resolve `/mnt/user-data/*` through a host directory when `host_workdir` is explicitly present. Otherwise keep the thread-scoped sandbox root even if execution mode is `host`.

### Task 3: Port Chat Page Shell And Working-Directory Panel

**Files:**
- Create: `frontend/src/components/workspace/new-chat-stage.tsx`
- Create: `frontend/src/components/workspace/runtime-mode-toggle.tsx`
- Create: `frontend/src/components/workspace/artifacts/working-directory-trigger.tsx`
- Create: `frontend/src/components/workspace/workspace-switcher.tsx`
- Create or port: `frontend/src/core/runtime/index.ts`
- Create or port: `frontend/src/core/runtime/profile.ts`
- Modify: `frontend/src/app/workspace/chats/[thread_id]/page.tsx`
- Modify: `frontend/src/components/workspace/chats/chat-box.tsx`
- Modify: `frontend/src/components/workspace/artifacts/context.tsx`
- Modify: `frontend/src/components/workspace/artifacts/index.ts`
- Modify: `frontend/src/components/workspace/workspace-header.tsx`
- Modify: `frontend/src/components/workspace/workspace-sidebar.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

Steps:

1. Port the donor new-chat composition: hero stage, translucent floating composer, centered runtime toggle, and top-right working-directory trigger.
2. Replace the stale "presentational-only workspace" assumption with a simplified real model:
   - show the current app workspace
   - do not add multi-workspace switching in this rollout
   - keep the label and empty-state copy grounded in the single-workspace model
3. Extend the artifacts shell with a distinct `working-directory` panel instead of treating it as a renamed artifact list.

### Task 4: Port The Four Composer Shortcut Lanes And Their Submission Contract

**Files:**
- Modify: `frontend/src/components/workspace/input-box.tsx`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/utils.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/message-group.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list-item.tsx`
- Modify: `frontend/src/core/messages/utils.ts`
- Modify: `frontend/src/core/skills/hooks.ts`
- Modify: `frontend/src/core/mcp/hooks.ts`
- Create or port: `frontend/src/core/cli/api.ts`
- Create or port: `frontend/src/core/cli/hooks.ts`
- Create or port: `frontend/src/core/cli/types.ts`

Steps:

1. Recreate the donor chat-composer shortcut group with these four lanes:
   - `Context`
   - `Skill`
   - `MCP`
   - `CLI`
2. Match the donor interaction contract:
   - each lane opens its own searchable selector
   - selected items show counts on the button
   - selected items render in the inline summary strip below the textarea
   - `Cmd/Ctrl+/` and `Cmd/Ctrl+@` insert the inline mention triggers for the donor popup flow
3. On submit, translate the current selections into the same runtime payload shape the donor uses:
   - `requested_skills` in runtime context
   - implicit mention metadata on the outgoing human message
   - MCP / CLI / context selections preserved as diagnosable metadata instead of being silently flattened away
4. Update message rendering so the invoked shortcuts remain visible and understandable in the bubble/tool-result flow, matching donor UX expectations rather than disappearing after send.

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_paths_data_root.py tests/test_thread_data_paths.py tests/test_runtime_profile_repository.py tests/test_runtime_profile_api.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Chat page shows the donor-style runtime toggle and working-directory trigger.
- Web host mode can be selected without forcing a directory picker first.
- If an explicit host directory is bound, later attempts to change it follow the designed lock/validation rules.
- The composer shows the four shortcut lanes: `Context`, `Skill`, `MCP`, and `CLI`.
- Selecting shortcut items updates the inline summary strip and outgoing message behavior.
- Sent messages keep enough visible metadata that the chosen shortcut context is understandable from the bubble/tool-result flow.
- The current app workspace is presented as a single workspace rooted at `~/.nion-data/workspace`.
