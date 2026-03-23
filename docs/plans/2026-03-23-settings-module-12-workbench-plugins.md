# Workbench Plugins And Plugin Studio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add workbench plugin management only when plugin APIs and state exist in the current repo, and include the donor plugin creation/debug/package flow rather than only a settings list page.

**Architecture:** Treat this as another conditional feature lane. Do not ship the page unless plugin discovery, install/load/enable/disable, workbench slot routing, and plugin-studio session flows are real. The parity target is the donor workbench product lane: settings page plus plugin assistant entry, scaffold/import/seed/pull/package/publish flow, and runtime registration.

**Tech Stack:** React, TanStack Query, plugin backend APIs

---

**Dependency:** Module 11 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 13.

### Task 1: Capability Audit

**Files:**
- Inspect or create: `backend/app/gateway/routers/workbench/plugin_studio.py`
- Inspect or create: `backend/app/gateway/routers/workbench/_helpers.py`
- Inspect or create: `backend/app/gateway/routers/workbench/models.py`
- Inspect or create: `frontend/src/core/workbench/hooks.ts`
- Inspect or create: `frontend/src/core/workbench/loader.ts`
- Inspect or create: `frontend/src/core/workbench/marketplace.ts`
- Inspect or create: `frontend/src/core/workbench/registry.ts`
- Inspect or create: `frontend/src/core/workbench/types.ts`
- Inspect or create: `frontend/src/plugins/index.ts`

Steps:

1. Verify whether installed-plugin metadata, package loading, enable/disable, uninstall, and runtime registration exist.
2. Verify whether plugin-studio session routes exist for create/generate/import/seed/pull/package/publish.
3. If not, implement the missing runtime surfaces first instead of shipping a dead settings page.

### Task 2: Port Plugin Management Surface

**Files:**
- Create: `frontend/src/components/workspace/settings/workbench-plugins-page.tsx`
- Create or port: `frontend/src/core/workbench/hooks.ts`
- Create or port: `frontend/src/core/workbench/loader.ts`
- Create or port: `frontend/src/core/workbench/marketplace.ts`
- Create or port: `frontend/src/components/plugin-initializer.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`

Steps:

1. Port the donor installed/built-in split, enable/disable, upload, download, and uninstall flows.
2. Keep the settings page wired to the same runtime registry that artifact/workbench rendering will use.
3. Expose an explicit entry point from settings into plugin creation/debug.

### Task 3: Port Plugin Assistant / Studio If Supported

**Files:**
- Create or port: `frontend/src/app/workspace/plugins/assistant/page.tsx`
- Create or port: `frontend/src/app/workspace/plugins/assistant/layout.tsx`
- Create or port: `backend/app/gateway/routers/workbench/plugin_studio.py`
- Create or port: `backend/app/gateway/routers/workbench/_helpers.py`
- Create or port: `backend/app/gateway/routers/workbench/models.py`
- Modify: `frontend/src/core/threads/utils.ts`

Steps:

1. Port the donor plugin assistant route and hidden-thread/session binding flow.
2. Support draft scaffold/import, seed-to-workdir, pull-from-workdir, auto-verify, package, and publish.
3. Make the settings-page "create plugin" action open a real end-to-end creation flow.

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Plus any backend plugin tests added in this module.

### Human E2E Checklist

- Plugin list renders correctly if shipped.
- Enable/disable, upload, download, and uninstall persist correctly.
- "Create plugin" from settings opens a real plugin assistant / studio flow.
- A plugin draft can be seeded into a workdir, pulled back, and packaged without leaving the product shell.
