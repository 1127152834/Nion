# Tool Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the `Nion-Agent` tool settings page and let users manage built-in tool groups without YAML.

**Architecture:** Reuse the current repo's `tools` and `tool_groups` schema, but present it through the richer `Nion-Agent` UI sections.

**Tech Stack:** React, Config Center hooks, current tool config schema

---

**Dependency:** Module 04 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 06.

### Task 1: Port Tool Page

**Files:**
- Create: `frontend/src/components/workspace/settings/tool-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/tools-section.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

### Task 2: Verify Backend Compatibility

**Files:**
- Modify: `backend/packages/harness/deerflow/config/tool_config.py`
- Test: `backend/tests/test_tool_config_validation.py`

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_config_validation.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Tool groups render correctly.
- Enabling/disabling or editing built-in tool config saves successfully.
- No YAML edit is required to affect tool config.
