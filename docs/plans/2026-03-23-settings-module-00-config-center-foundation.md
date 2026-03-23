# Config Center Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the config-storage, config API, and settings-shell backbone required for all later settings modules.

**Architecture:** Introduce a SQLite-backed config store and Config Center API, then port the `Nion-Agent` settings shell and section navigation onto the current repo. Keep current runtime behavior primary; this module only provides the new configuration backbone and container UI. Chat runtime/workdir/composer parity is intentionally handled in Module `00A`, not here.

**Tech Stack:** FastAPI, Pydantic, SQLite, React, TanStack Query

---

**E2E Gate:** Stop after this module and wait for user approval before starting Module 00A.

### Task 1: Backend Config Store

**Files:**
- Create: `backend/packages/harness/deerflow/config/config_store.py`
- Create: `backend/packages/harness/deerflow/config/config_repository.py`
- Modify: `backend/packages/harness/deerflow/config/app_config.py`
- Test: `backend/tests/test_config_store.py`
- Test: `backend/tests/test_config_repository.py`

Steps:

1. Write failing tests for `read`, `write(expected_version)`, and empty-store bootstrap.
2. Implement versioned store and repository without YAML import.
3. Make `get_app_config()` read from store-backed config.

### Task 2: Gateway Config API

**Files:**
- Create: `backend/app/gateway/routers/config.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Modify: `backend/app/gateway/app.py`
- Test: `backend/tests/test_gateway_config_api.py`

Steps:

1. Add `GET /api/config`, `GET /api/config/schema`, `POST /api/config/validate`, `PUT /api/config`, `GET /api/config/runtime-status`.
2. Return conflict and validation payloads compatible with the future frontend editor.
3. Update error messages to stop telling users to edit `config.yaml`.

### Task 3: Frontend Config Center Backbone

**Files:**
- Create: `frontend/src/core/config-center/api.ts`
- Create: `frontend/src/core/config-center/hooks.ts`
- Create: `frontend/src/core/config-center/types.ts`
- Create: `frontend/src/core/config-center/index.ts`
- Create: `frontend/src/components/workspace/settings/use-config-editor.ts`
- Create: `frontend/src/components/workspace/settings/settings-sections.ts`
- Create: `frontend/src/components/workspace/settings/settings-dialog-context.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

Steps:

1. Port grouped settings navigation from `Nion-Agent`.
2. Wire the dialog to Config Center hooks.
3. Replace visible user-facing `DeerFlow` wording with `Nion`.
4. Do not yet fold chat runtime/workspace behavior into this module; only establish the shell and API contracts it will depend on.

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_config_store.py tests/test_config_repository.py tests/test_gateway_config_api.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Settings dialog opens with grouped navigation.
- App boots without requiring a local `config.yaml`.
- Config API responds successfully in browser/devtools.
- No obvious `DeerFlow` branding remains in the touched settings shell.
