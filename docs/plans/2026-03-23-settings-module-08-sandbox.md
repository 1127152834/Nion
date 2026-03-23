# Sandbox Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `Nion-Agent`-style sandbox settings page on top of the current repo's sandbox config schema and runtime behavior, with copy and validation that stay consistent with the chat-page sandbox/host runtime model.

**Architecture:** Keep the current repo's sandbox provider model and validation rules. Expose only options the current runtime truly supports. The page must explain strict sandbox mode, backend-host execution in web deployments, and optional host-directory binding in a way that matches the chat runtime profile instead of the donor's desktop-only assumptions.

**Tech Stack:** React, Config Center hooks, current sandbox config schema

---

**Dependency:** Module 07 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 09.

### Task 1: Port Sandbox Page

**Files:**
- Create: `frontend/src/components/workspace/settings/sandbox-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/sandbox-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/checkpointer-section.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`

Steps:

1. Port the donor page structure and section rhythm.
2. Rewrite the explanatory copy so `sandbox` vs `host` remains correct for both web and desktop.
3. Surface any runtime-mode constraints that must match the chat runtime toggle.

### Task 2: Tighten Validation

**Files:**
- Modify: `backend/packages/harness/deerflow/config/sandbox_config.py`
- Modify: `backend/packages/harness/deerflow/config/checkpointer_config.py`
- Test: `backend/tests/test_sandbox_settings_validation.py`

Steps:

1. Validate strict-mode interactions and unsupported combinations.
2. Do not require a host directory for web host mode by default.
3. Keep any explicit host-directory binding rules aligned with the runtime-profile module.

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_sandbox_settings_validation.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Sandbox mode can be edited from the UI.
- Invalid combinations are blocked with clear validation messages.
- Runtime still starts with the saved sandbox settings.
- Settings-page copy and chat-page runtime toggle describe the same sandbox/host semantics.
