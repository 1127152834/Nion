# Search Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `Nion-Agent`-style search settings page that maps cleanly to the current repo's actual search and fetch capabilities.

**Architecture:** Do not fake provider support. Use the current repo's existing search tools and config surface as the runtime truth, then layer the `Nion-Agent` UX on top of those supported providers only.

**Tech Stack:** React, Config Center hooks, current search tool configuration

---

**Dependency:** Module 09 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 11.

### Task 1: Backend Capability Mapping

**Files:**
- Modify: `backend/packages/harness/deerflow/config/tool_config.py`
- Modify: `backend/packages/harness/deerflow/config/app_config.py`
- Test: `backend/tests/test_search_settings_config.py`

### Task 2: Frontend Search Page

**Files:**
- Create: `frontend/src/components/workspace/settings/search-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_search_settings_config.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Search provider ordering/config works for supported providers.
- Disabled or unsupported provider options are not exposed as working features.
