# Remove Main App `config.yaml` Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove main application runtime dependence on root `config.yaml`, make SQLite Config Center the only app-config source of truth, and migrate stale session-policy model selections to the default runtime model.

**Architecture:** Collapse `AppConfig` loading onto the SQLite config store, remove legacy YAML resolution/bootstrap APIs for the main app, and keep only non-app `config.yaml` usages that belong to custom agent bundles. Normalize session-policy model selection both in the UI and at runtime so deleted policy models always fall back to the system default model.

**Tech Stack:** Python (`pydantic`, `sqlite3`, `pytest`, `ruff`), TypeScript/React (`react-query`, `node:test`, `tsc`)

---

### Task 1: Delete main app YAML entrypoints from `AppConfig`

**Files:**
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `backend/packages/harness/nion/config/config_store.py`
- Test: `backend/tests/test_app_config_store_bootstrap.py`
- Test: `backend/tests/test_app_config_reload.py`
- Delete or rewrite: `backend/tests/test_config_version.py`
- Delete or rewrite: `backend/tests/test_automation_config_loading.py`

**Step 1: Write/adjust failing tests**

- Add/adjust tests so main app config only loads from SQLite.
- Assert `AppConfig.from_store_with_meta()` / `get_app_config()` work without any YAML file.
- Assert removed APIs (`from_file`, `resolve_config_path`, `from_store_or_file*`) are no longer used by the app path.

**Step 2: Run targeted tests to verify failure**

Run:

```bash
cd backend && uv run pytest tests/test_app_config_store_bootstrap.py tests/test_app_config_reload.py tests/test_config_version.py tests/test_automation_config_loading.py -q
```

**Step 3: Implement minimal runtime change**

- Remove main app YAML path resolution and version-check helpers from `AppConfig`.
- Make `_load_and_cache()` / `ensure_latest_app_config()` strictly store-backed.
- Keep SQLite bootstrap defaults in `config_store.py`.

**Step 4: Run tests and lint**

Run:

```bash
cd backend && uv run pytest tests/test_app_config_store_bootstrap.py tests/test_app_config_reload.py tests/test_config_version.py tests/test_automation_config_loading.py -q
cd backend && uv run ruff check packages/harness/nion/config/app_config.py packages/harness/nion/config/config_store.py tests/test_app_config_store_bootstrap.py tests/test_app_config_reload.py tests/test_config_version.py tests/test_automation_config_loading.py
```

### Task 2: Remove stale policy-model persistence assumptions

**Files:**
- Modify: `frontend/src/components/workspace/settings/session-policy-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/title-section.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/suggestions-section.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/summarization-section.tsx`
- Create: `frontend/src/components/workspace/settings/session-policy-model-selection.ts`
- Test: `frontend/src/components/workspace/settings/session-policy-model-selection.test.ts`
- Modify: `backend/packages/harness/nion/models/factory.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/title_middleware.py`
- Modify: `backend/app/gateway/routers/suggestions.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `backend/packages/harness/nion/agents/memory/updater.py`

**Step 1: Write failing tests**

- Frontend: invalid/deleted policy model names should render/save as “use default model”.
- Backend: stale policy model names should resolve to the default runtime model instead of failing.

**Step 2: Run tests to verify failure**

Run:

```bash
cd frontend && node --experimental-strip-types --test src/components/workspace/settings/session-policy-model-selection.test.ts
cd backend && uv run pytest tests/test_title_middleware_core_logic.py tests/test_suggestions_router.py tests/test_model_factory_provider_id.py tests/test_model_registry_service.py -q
```

**Step 3: Implement minimal normalization**

- UI: normalize empty or deleted policy selections to default-model sentinel.
- Runtime: resolve stale title/suggestions/summarization/memory policy model names via default-model fallback.

**Step 4: Run tests and type/lint checks**

Run:

```bash
cd frontend && node --experimental-strip-types --test src/components/workspace/settings/session-policy-model-selection.test.ts
cd frontend && pnpm exec tsc --noEmit
cd backend && uv run pytest tests/test_title_middleware_core_logic.py tests/test_suggestions_router.py tests/test_model_factory_provider_id.py tests/test_model_registry_service.py -q
cd backend && uv run ruff check app/gateway/routers/suggestions.py packages/harness/nion/models/factory.py packages/harness/nion/agents/middlewares/title_middleware.py packages/harness/nion/agents/lead_agent/agent.py packages/harness/nion/agents/memory/updater.py packages/harness/nion/model_management/service.py tests/test_title_middleware_core_logic.py tests/test_suggestions_router.py tests/test_model_factory_provider_id.py tests/test_model_registry_service.py
```

### Task 3: Delete root `config.yaml` and remove main-app references

**Files:**
- Delete: `config.yaml`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `backend/docs/CONFIGURATION.md`
- Modify: `backend/docs/SETUP.md`
- Modify: `backend/docs/ARCHITECTURE.md`
- Modify any main-app code comments/docstrings that still instruct app runtime to read `config.yaml`

**Step 1: Write failing documentation/reference checks**

- Add or adapt lightweight tests that reject main-app docs/code comments claiming runtime depends on root `config.yaml`.

**Step 2: Remove the file and stale references**

- Delete the local root `config.yaml`.
- Update docs and comments to say Config Center / SQLite is the only main app source of truth.
- Keep custom-agent `config.yaml` references intact.

**Step 3: Verify**

Run:

```bash
git status --short
cd backend && uv run pytest tests/test_app_config_store_bootstrap.py tests/test_app_config_reload.py tests/test_title_middleware_core_logic.py tests/test_suggestions_router.py tests/test_model_factory_provider_id.py tests/test_model_registry_service.py -q
cd frontend && pnpm exec tsc --noEmit
```

### Task 4: Final runtime verification

**Files:**
- No new files expected

**Step 1: Restart daemon on current code**

Run:

```bash
cd backend && uv run python -m nion.cli.main daemon stop
cd backend && uv run python -m nion.cli.main daemon status
```

**Step 2: Verify runtime config source**

Run:

```bash
cd backend && uv run python - <<'PY'
from nion.config import get_app_config
cfg = get_app_config()
print(cfg.model_dump().keys())
print(cfg.title.model_name, cfg.suggestions.model_name, cfg.summarization.model_name)
PY
```

**Step 3: Manual QA**

- Open settings -> session policy.
- Confirm title / suggestions / summarization model selectors default to system default model.
- Confirm deleting the previously selected model auto-falls back to default.
- Send a chat message and verify no follow-up/title background task reports a missing stale model.
