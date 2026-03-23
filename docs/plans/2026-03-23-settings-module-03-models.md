# Model Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `Nion-Agent`-style model settings page that edits the current repo's model configuration safely through the new Config Center.

**Architecture:** Reuse the current runtime `models[]` schema as the canonical execution format. Port the `Nion-Agent` provider-first editing UX only where it can normalize cleanly back into the current repo schema.

**Tech Stack:** React, Config Center hooks, Pydantic model config

---

**Dependency:** Module 02 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 04.

### Task 1: Backend Schema Support

**Files:**
- Modify: `backend/packages/harness/deerflow/config/model_config.py`
- Modify: `backend/packages/harness/deerflow/config/app_config.py`
- Test: `backend/tests/test_model_config_validation.py`

Steps:

1. Confirm the store-backed schema can validate all current model fields.
2. Add any missing typed fields needed by the new editor.

### Task 2: Frontend Model Page

**Files:**
- Create: `frontend/src/components/workspace/settings/model-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/models/index.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/models/utils.ts`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

Steps:

1. Port the `Nion-Agent` model page visual structure.
2. Save through `use-config-editor`.
3. Keep output normalized to the current repo runtime model format.

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_model_config_validation.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Add, edit, and remove a model through the page.
- Save persists without editing YAML.
- Model list used by the chat composer updates correctly.
