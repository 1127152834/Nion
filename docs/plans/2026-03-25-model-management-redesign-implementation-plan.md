# Model Management Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current config-centered model settings flow with a database-backed provider and model management system, and make runtime model resolution read from that new database truth.

**Architecture:** Build a dedicated backend `model_management` domain with SQLite-backed repositories, seeded built-in provider templates, encrypted provider credentials, a runtime `ModelRegistryService`, and new management/runtime APIs. Replace the current frontend settings page with a provider marketplace plus provider detail flow, then migrate runtime entry points and dependent settings selectors away from `config.models`.

**Tech Stack:** Python, FastAPI, SQLite, Pydantic, existing config-store path resolution, React, TanStack Query, existing settings shell, Next.js, TypeScript, ESLint, pytest

---

## Preflight Constraints

- Current frontend baseline is not clean. In the isolated worktree, `pnpm frontend:check` fails with unrelated pre-existing lint/type errors outside this feature area. Treat new errors in touched files as blockers; do not attempt unrelated cleanup in this lane.
- Current backend model validation baseline is clean. In the isolated worktree, `cd backend && uv run pytest tests/test_model_config_validation.py -q` passes with `8 passed`.
- The implementation must not reintroduce `models[]` / `model_providers[]` as the long-term source of truth.
- No new dependencies unless existing stdlib or current dependency graph cannot support the requirement.

## Task 1: Add the Model-Management Domain Models and SQLite Schema

**Files:**
- Create: `backend/packages/harness/nion/model_management/__init__.py`
- Create: `backend/packages/harness/nion/model_management/models.py`
- Create: `backend/packages/harness/nion/model_management/repository.py`
- Test: `backend/tests/test_model_management_repository.py`

**Step 1: Write the failing repository schema test**

```python
def test_repository_initializes_provider_tables(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    with repo._connect() as conn:
        table_names = {
            row["name"]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }

    assert "provider_templates" in table_names
    assert "provider_template_category_memberships" in table_names
    assert "provider_instances" in table_names
    assert "provider_models" in table_names
    assert "model_bindings" in table_names
```

**Step 2: Run the new test to confirm the tables do not exist yet**

Run: `cd backend && uv run pytest tests/test_model_management_repository.py::test_repository_initializes_provider_tables -q`

Expected: FAIL because `ModelManagementRepository` does not exist yet.

**Step 3: Create the new Pydantic domain models**

Create `backend/packages/harness/nion/model_management/models.py` with:

```python
class ProviderTemplate(BaseModel): ...
class ProviderTemplateCategoryMembership(BaseModel): ...
class ProviderInstance(BaseModel): ...
class ProviderModel(BaseModel): ...
class ModelBinding(BaseModel): ...
```

Use explicit enums or literals for:

- provider category
- provider kind
- provider/model test status
- discovery mode
- base URL mode

**Step 4: Implement the SQLite repository bootstrap**

Create `backend/packages/harness/nion/model_management/repository.py` with:

```python
class ModelManagementRepository:
    def __init__(self, db_path: str | Path):
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()
```

The `_initialize()` method should create:

- `provider_templates`
- `provider_template_category_memberships`
- `provider_instances`
- `provider_models`
- `model_bindings`

Add indexes for:

- template `code`
- instance `provider_template_id`
- model `provider_instance_id`
- binding `binding_key`

**Step 5: Add minimal CRUD helpers**

Implement the first repository methods:

- `list_provider_templates(category: str | None = None)`
- `upsert_provider_template(template: ProviderTemplate)`
- `list_provider_instances()`
- `save_provider_instance(instance: ProviderInstance)`
- `list_provider_models(provider_instance_id: str)`
- `save_provider_model(model: ProviderModel)`
- `get_binding(binding_key: str)`
- `save_binding(binding: ModelBinding)`

Serialize full Pydantic payloads into JSON columns for flexible metadata while keeping top-level query columns explicit.

**Step 6: Run the repository test suite**

Run: `cd backend && uv run pytest tests/test_model_management_repository.py -q`

Expected: PASS.

**Step 7: Commit**

```bash
git add backend/packages/harness/nion/model_management/__init__.py \
  backend/packages/harness/nion/model_management/models.py \
  backend/packages/harness/nion/model_management/repository.py \
  backend/tests/test_model_management_repository.py
git commit -m "Add SQLite schema for model management"
```

## Task 2: Seed Built-In Provider Templates and Category Memberships

**Files:**
- Create: `backend/packages/harness/nion/model_management/seed.py`
- Modify: `backend/packages/harness/nion/model_management/repository.py`
- Test: `backend/tests/test_model_management_seed.py`

**Step 1: Write the failing seed test**

```python
def test_seed_builtin_templates_creates_marketplace_catalog(tmp_path):
    repo = ModelManagementRepository(tmp_path / "config.db")

    seed_builtin_provider_templates(repo)
    domestic = repo.list_provider_templates(category="domestic")
    global_templates = repo.list_provider_templates(category="global")

    assert any(item.code == "minimax-cn" for item in domestic)
    assert any(item.code == "openrouter" for item in global_templates)
    assert sum(item.code == "custom-provider" for item in domestic) == 1
```

**Step 2: Run the seed test to verify it fails**

Run: `cd backend && uv run pytest tests/test_model_management_seed.py::test_seed_builtin_templates_creates_marketplace_catalog -q`

Expected: FAIL because the seed function does not exist.

**Step 3: Implement the seed catalog**

Create `seed.py` with:

```python
BUILTIN_PROVIDER_TEMPLATES = [
    {"code": "minimax-cn", "name": "MiniMax", "category": "domestic", ...},
    {"code": "zhipu", "name": "智谱", "category": "domestic", ...},
    ...
]
```

Include the full approved template set:

- Domestic: `minimax-cn`, `zhipu`, `deepseek`, `stepfun`, `longcat`, `kimi-coding-plan`, `moonshot-cn`, `bailian-coding-plan`, `bailing`, `mimo`, `custom-provider`
- Aggregator: `doubao`, `modelscope`, `siliconflow-cn`, `custom-provider`
- Global: `minimax-global`, `z-ai`, `openrouter`, `siliconflow-global`, `zenmux`, `aihubmix`, `nvidia-build`, `dmxapi`, `groq`, `cerebras`, `custom-provider`
- Local: `ollama`, `lm-studio`, `custom-provider`

**Step 4: Store `custom-provider` once and map it into all categories**

Use `provider_template_category_memberships` for:

```python
repo.save_category_membership(
    ProviderTemplateCategoryMembership(
        provider_template_id=custom_template.id,
        category="domestic",
        sort_order=999,
    )
)
```

Repeat for all categories.

**Step 5: Add an idempotent seed entry point**

Expose:

```python
def seed_builtin_provider_templates(repo: ModelManagementRepository) -> None:
    ...
```

Calling it twice must not create duplicates.

**Step 6: Run the seed tests**

Run: `cd backend && uv run pytest tests/test_model_management_seed.py -q`

Expected: PASS.

**Step 7: Commit**

```bash
git add backend/packages/harness/nion/model_management/seed.py \
  backend/packages/harness/nion/model_management/repository.py \
  backend/tests/test_model_management_seed.py
git commit -m "Seed built-in provider templates"
```

## Task 3: Add Provider Credential Encryption and Masking

**Files:**
- Create: `backend/packages/harness/nion/model_management/crypto.py`
- Modify: `backend/packages/harness/nion/model_management/repository.py`
- Test: `backend/tests/test_model_management_crypto.py`

**Step 1: Write the failing encryption test**

```python
def test_encrypt_and_decrypt_provider_api_key_round_trip():
    key = build_model_management_secret("test-secret")
    encrypted = encrypt_provider_secret("sk-test-123", key)

    assert encrypted != "sk-test-123"
    assert decrypt_provider_secret(encrypted, key) == "sk-test-123"
```

**Step 2: Run the crypto test to verify failure**

Run: `cd backend && uv run pytest tests/test_model_management_crypto.py::test_encrypt_and_decrypt_provider_api_key_round_trip -q`

Expected: FAIL because the crypto module does not exist.

**Step 3: Implement deterministic application key loading**

Create `crypto.py` with:

```python
def get_model_management_secret() -> bytes:
    raw = os.getenv("NION_MODEL_MANAGEMENT_SECRET", "").strip()
    if not raw:
        raise RuntimeError("NION_MODEL_MANAGEMENT_SECRET is required")
    return hashlib.sha256(raw.encode("utf-8")).digest()
```

If the repository already has an approved local secret utility, reuse that instead of duplicating logic.

**Step 4: Implement encrypt/decrypt helpers**

Add:

```python
def encrypt_provider_secret(value: str, secret: bytes) -> str: ...
def decrypt_provider_secret(value: str, secret: bytes) -> str: ...
def mask_provider_secret(value: str) -> str: ...
```

Store ciphertext only in `api_key_encrypted`. Store a UI-safe masked value in `api_key_masked`.

**Step 5: Wire encryption into repository writes**

When saving `ProviderInstance`, require callers to pass the plaintext API key separately:

```python
repo.save_provider_instance(instance, api_key_plaintext="sk-...")
```

The repository should:

- encrypt before save
- update the masked field
- never return plaintext from list/detail methods

**Step 6: Run crypto and repository tests**

Run:

```bash
cd backend && uv run pytest tests/test_model_management_crypto.py tests/test_model_management_repository.py -q
```

Expected: PASS.

**Step 7: Commit**

```bash
git add backend/packages/harness/nion/model_management/crypto.py \
  backend/packages/harness/nion/model_management/repository.py \
  backend/tests/test_model_management_crypto.py \
  backend/tests/test_model_management_repository.py
git commit -m "Encrypt provider credentials in model management"
```

## Task 4: Add the Runtime Registry Service and Switch Model Resolution

**Files:**
- Create: `backend/packages/harness/nion/model_management/service.py`
- Modify: `backend/packages/harness/nion/models/factory.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Test: `backend/tests/test_model_registry_service.py`
- Test: `backend/tests/test_model_factory_provider_id.py`

**Step 1: Write the failing registry service test**

```python
def test_registry_resolves_default_chat_binding(tmp_path, monkeypatch):
    repo = ModelManagementRepository(tmp_path / "config.db")
    seed_builtin_provider_templates(repo)
    # create provider instance + provider model + chat.default binding

    service = ModelRegistryService(repo=repo, secret_provider=lambda: b"x" * 32)
    resolved = service.resolve_binding("chat.default")

    assert resolved.model.model_id == "gpt-4.1"
    assert resolved.provider.display_name == "OpenAI"
```

**Step 2: Run the registry test to verify failure**

Run: `cd backend && uv run pytest tests/test_model_registry_service.py::test_registry_resolves_default_chat_binding -q`

Expected: FAIL because `ModelRegistryService` does not exist.

**Step 3: Implement `ModelRegistryService`**

Create `service.py` with:

```python
class ResolvedRuntimeModel(BaseModel):
    provider: ProviderInstance
    template: ProviderTemplate | None
    model: ProviderModel
    binding_key: str | None = None


class ModelRegistryService:
    def resolve_binding(self, binding_key: str) -> ResolvedRuntimeModel: ...
    def resolve_model(self, provider_model_id: str) -> ResolvedRuntimeModel: ...
    def list_runtime_models(self) -> list[ResolvedRuntimeModel]: ...
```

Add an internal cache and an explicit `refresh()` method, but keep the first version simple and synchronous.

**Step 4: Update `create_chat_model()` to use the registry**

Replace the direct `config.models[0]` path in [factory.py](/Users/zhangtiancheng/.config/superpowers/worktrees/nion/model-management-redesign/backend/packages/harness/nion/models/factory.py) with:

```python
registry = get_model_registry_service()
resolved = registry.resolve_binding("chat.default") if name is None else registry.resolve_by_runtime_name(name)
```

Map the resolved provider/template/model records into the provider constructor kwargs previously coming from `ModelConfig`.

**Step 5: Update callers that assume `config.models[0]`**

Replace current default-model assumptions in:

- `backend/packages/harness/nion/client.py`
- `backend/packages/harness/nion/tools/tools.py`

so they ask the registry for:

- runtime model list
- default binding
- named model resolution

**Step 6: Run the runtime tests**

Run:

```bash
cd backend && uv run pytest \
  tests/test_model_registry_service.py \
  tests/test_model_factory_provider_id.py \
  tests/test_model_config_validation.py -q
```

Expected: PASS.

**Step 7: Commit**

```bash
git add backend/packages/harness/nion/model_management/service.py \
  backend/packages/harness/nion/models/factory.py \
  backend/packages/harness/nion/client.py \
  backend/packages/harness/nion/tools/tools.py \
  backend/tests/test_model_registry_service.py \
  backend/tests/test_model_factory_provider_id.py
git commit -m "Route runtime model resolution through registry service"
```

## Task 5: Add Management APIs for Templates, Providers, Models, Bindings, and Tests

**Files:**
- Create: `backend/app/gateway/routers/model_admin.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/gateway/routers/models.py`
- Test: `backend/tests/test_model_admin_router.py`

**Step 1: Write the failing admin router test**

```python
def test_list_templates_by_category(client):
    response = client.get("/api/model-admin/templates?category=domestic")

    assert response.status_code == 200
    assert any(item["code"] == "minimax-cn" for item in response.json()["templates"])
```

**Step 2: Run the router test to verify failure**

Run: `cd backend && uv run pytest tests/test_model_admin_router.py::test_list_templates_by_category -q`

Expected: FAIL because the router does not exist.

**Step 3: Create the management router**

Add `model_admin.py` with endpoints for:

- `GET /api/model-admin/templates`
- `GET /api/model-admin/providers`
- `POST /api/model-admin/providers`
- `PATCH /api/model-admin/providers/{provider_id}`
- `DELETE /api/model-admin/providers/{provider_id}`
- `POST /api/model-admin/providers/{provider_id}/test`
- `POST /api/model-admin/providers/{provider_id}/discover-models`
- `POST /api/model-admin/providers/{provider_id}/models`
- `PATCH /api/model-admin/models/{model_id}`
- `DELETE /api/model-admin/models/{model_id}`
- `POST /api/model-admin/models/{model_id}/test`
- `GET /api/model-admin/bindings`
- `PUT /api/model-admin/bindings/{binding_key}`

Use the existing provider test and discovery helpers from [models.py](/Users/zhangtiancheng/.config/superpowers/worktrees/nion/model-management-redesign/backend/app/gateway/routers/models.py) rather than duplicating probe logic.

**Step 4: Keep the existing `/api/models` router as a compatibility facade**

Modify [models.py](/Users/zhangtiancheng/.config/superpowers/worktrees/nion/model-management-redesign/backend/app/gateway/routers/models.py) so:

- `GET /api/models` lists registry-backed runtime models
- `GET /api/models/{name}` resolves registry-backed runtime models
- current provider-test/discovery helpers remain shared by both routers

**Step 5: Mount the new router**

Update [app.py](/Users/zhangtiancheng/.config/superpowers/worktrees/nion/model-management-redesign/backend/app/gateway/app.py):

```python
from app.gateway.routers import model_admin
app.include_router(model_admin.router)
```

**Step 6: Run router tests**

Run:

```bash
cd backend && uv run pytest \
  tests/test_model_admin_router.py \
  tests/test_model_config_validation.py -q
```

Expected: PASS.

**Step 7: Commit**

```bash
git add backend/app/gateway/routers/model_admin.py \
  backend/app/gateway/app.py \
  backend/app/gateway/routers/models.py \
  backend/tests/test_model_admin_router.py
git commit -m "Expose model-management admin APIs"
```

## Task 6: Add Legacy Import from Config-Blob Models into the New Tables

**Files:**
- Create: `backend/packages/harness/nion/model_management/import_legacy.py`
- Modify: `backend/packages/harness/nion/config/config_repository.py`
- Test: `backend/tests/test_model_management_legacy_import.py`

**Step 1: Write the failing legacy import test**

```python
def test_legacy_models_are_imported_once(monkeypatch, tmp_path):
    repo = ConfigRepository()
    config, version, _ = repo.read()
    config["model_providers"] = [...]
    config["models"] = [...]
    repo.write(config, version)

    importer = LegacyModelConfigImporter(...)
    result = importer.import_if_needed()

    assert result.imported_providers == 1
    assert result.imported_models == 2
    assert importer.import_if_needed().imported_providers == 0
```

**Step 2: Run the import test to verify failure**

Run: `cd backend && uv run pytest tests/test_model_management_legacy_import.py::test_legacy_models_are_imported_once -q`

Expected: FAIL because the importer does not exist.

**Step 3: Implement a one-time importer**

Create `import_legacy.py` with:

```python
class LegacyModelConfigImporter:
    def import_if_needed(self) -> LegacyImportResult: ...
```

Rules:

- if the database already has provider instances or models, do nothing
- otherwise, read legacy `model_providers` and `models` from the config store
- map them into provider instances and provider models
- create `chat.default` binding for the first usable model

**Step 4: Trigger import during gateway/runtime startup**

Modify [config_repository.py](/Users/zhangtiancheng/.config/superpowers/worktrees/nion/model-management-redesign/backend/packages/harness/nion/config/config_repository.py) or the nearest startup bootstrap point so the importer runs before registry-backed runtime calls begin.

**Step 5: Add import observability**

Log a compact message:

```python
logger.info("Imported %s providers and %s models from legacy config", ...)
```

No secret values in logs.

**Step 6: Run legacy import tests**

Run: `cd backend && uv run pytest tests/test_model_management_legacy_import.py -q`

Expected: PASS.

**Step 7: Commit**

```bash
git add backend/packages/harness/nion/model_management/import_legacy.py \
  backend/packages/harness/nion/config/config_repository.py \
  backend/tests/test_model_management_legacy_import.py
git commit -m "Add one-time legacy import for model management"
```

## Task 7: Add Frontend Types, API Clients, and Query Hooks for Model Management

**Files:**
- Create: `frontend/src/core/model-admin/types.ts`
- Create: `frontend/src/core/model-admin/api.ts`
- Create: `frontend/src/core/model-admin/hooks.ts`
- Modify: `frontend/src/core/models/api.ts`
- Modify: `frontend/src/core/models/hooks.ts`
- Test: `frontend/src/core/model-admin/api.test.ts`

**Step 1: Write the failing API helper test**

```ts
test("loadProviderTemplates builds the category query", async () => {
  global.fetch = mockFetchJson({ templates: [] });

  await loadProviderTemplates({ category: "domestic" });

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/model-admin/templates?category=domestic"),
  );
});
```

Use the repository’s preferred frontend test style if an adjacent example exists; otherwise use the simplest existing node-based test harness already present in `frontend/src`.

**Step 2: Run the frontend API test to verify failure**

Run: `cd frontend && pnpm exec vitest --run src/core/model-admin/api.test.ts`

Expected: FAIL if the project already has Vitest configured. If not, add the test using the existing node:test pattern used elsewhere in `frontend/src/core`.

**Step 3: Implement typed admin APIs**

Create `api.ts` with:

```ts
export async function loadProviderTemplates(...)
export async function loadProviderInstances()
export async function createProviderInstance(...)
export async function updateProviderInstance(...)
export async function testProviderInstance(...)
export async function discoverProviderModels(...)
export async function addProviderModels(...)
export async function testProviderModel(...)
export async function updateBinding(...)
```

**Step 4: Implement query hooks**

Create `hooks.ts` with:

```ts
export function useProviderTemplates(category?: ProviderCategory) { ... }
export function useProviderInstances() { ... }
export function useProviderBindings() { ... }
```

**Step 5: Re-scope legacy model hooks**

Modify [frontend/src/core/models/api.ts](/Users/zhangtiancheng/.config/superpowers/worktrees/nion/model-management-redesign/frontend/src/core/models/api.ts) and [hooks.ts](/Users/zhangtiancheng/.config/superpowers/worktrees/nion/model-management-redesign/frontend/src/core/models/hooks.ts) so they become runtime-catalog readers only, not settings-editor helpers.

**Step 6: Run the touched frontend tests and lint/typecheck on touched files**

Run:

```bash
cd frontend && pnpm exec eslint src/core/model-admin src/core/models --ext .ts,.tsx
cd frontend && pnpm exec tsc --noEmit
```

Expected: no new errors in the touched paths. If unrelated repo-wide typecheck errors remain, record them and continue.

**Step 7: Commit**

```bash
git add frontend/src/core/model-admin/types.ts \
  frontend/src/core/model-admin/api.ts \
  frontend/src/core/model-admin/hooks.ts \
  frontend/src/core/models/api.ts \
  frontend/src/core/models/hooks.ts \
  frontend/src/core/model-admin/api.test.ts
git commit -m "Add frontend model-management data layer"
```

## Task 8: Replace the Settings Page Shell with Marketplace and Provider Detail States

**Files:**
- Modify: `frontend/src/components/workspace/settings/model-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/model-management/types.ts`
- Create: `frontend/src/components/workspace/settings/model-management/provider-instance-list.tsx`
- Create: `frontend/src/components/workspace/settings/model-management/provider-marketplace.tsx`
- Create: `frontend/src/components/workspace/settings/model-management/provider-detail.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`

**Step 1: Write the failing page-state test**

Add a minimal component test or snapshot-equivalent asserting that the page:

- defaults to marketplace view
- renders the left-side provider instance list
- shows the four category tabs

**Step 2: Run the page-state test to verify failure**

Run the project’s existing frontend test command for this file or, if none exists, use the smallest node-based rendering test already used in adjacent settings modules.

Expected: FAIL because the new components do not exist.

**Step 3: Remove the old provider/models dual-tab shell**

Rewrite [model-settings-page.tsx](/Users/zhangtiancheng/.config/superpowers/worktrees/nion/model-management-redesign/frontend/src/components/workspace/settings/model-settings-page.tsx) so its local state is:

```ts
type ModelManagementView =
  | { kind: "marketplace"; category: ProviderCategory }
  | { kind: "provider-detail"; providerId: string }
  | { kind: "custom-provider-create"; category: ProviderCategory };
```

**Step 4: Add the left instance list**

Create `provider-instance-list.tsx` to render:

- provider display name
- primary model subtitle
- status badge
- bottom `Add Provider` action

**Step 5: Add the marketplace tab panel**

Create `provider-marketplace.tsx` to render:

- tabs: domestic, aggregator, global, local
- provider template cards
- disabled cards when `allows_multiple_instances` is false and already active
- global network warning banner from template/category metadata

**Step 6: Add i18n copy**

Replace current `settings.modelPage` and `configSections.models` copy with page-owned copy for:

- marketplace
- provider detail
- provider test
- model test
- custom provider form

**Step 7: Run targeted frontend verification**

Run:

```bash
cd frontend && pnpm exec eslint src/components/workspace/settings/model-settings-page.tsx src/components/workspace/settings/model-management src/core/i18n/locales --ext .ts,.tsx
```

Expected: no new lint errors in touched files.

**Step 8: Commit**

```bash
git add frontend/src/components/workspace/settings/model-settings-page.tsx \
  frontend/src/components/workspace/settings/model-management/types.ts \
  frontend/src/components/workspace/settings/model-management/provider-instance-list.tsx \
  frontend/src/components/workspace/settings/model-management/provider-marketplace.tsx \
  frontend/src/components/workspace/settings/model-management/provider-detail.tsx \
  frontend/src/components/workspace/settings/settings-dialog.tsx \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/types.ts
git commit -m "Replace model settings shell with provider marketplace"
```

## Task 9: Implement Provider Detail, Discovery, Model Selection, and Test Actions

**Files:**
- Modify: `frontend/src/components/workspace/settings/model-management/provider-detail.tsx`
- Create: `frontend/src/components/workspace/settings/model-management/provider-model-list.tsx`
- Create: `frontend/src/components/workspace/settings/model-management/provider-credentials-form.tsx`
- Test: `frontend/src/components/workspace/settings/model-management/provider-detail.test.tsx`

**Step 1: Write the failing provider-detail interaction test**

Cover this path:

1. enter built-in provider detail
2. input API key
3. click `Test Provider Connection`
4. click `Discover Models`
5. select discovered models
6. click `Test Model` on one row

**Step 2: Run the interaction test to verify failure**

Run the smallest available frontend test command for the new provider detail component.

Expected: FAIL because the interaction components do not exist.

**Step 3: Add the provider credentials form**

Create `provider-credentials-form.tsx` with built-in vs custom rendering rules:

- built-in: hide fixed `base_url`, show `Get API Key`
- custom: show display name, protocol, base URL, optional headers
- local templates: make API key optional if the template allows it

**Step 4: Add the model list with multi-select discovery**

Create `provider-model-list.tsx` with:

- discovered model multi-select when the provider supports discovery
- manual `model_id` entry fallback when it does not
- row actions for:
  - set primary
  - reorder
  - test model
  - delete

**Step 5: Wire provider and model tests to status badges**

Map backend statuses to UI badges:

- provider: `untested`, `success`, `failed`
- model: `untested`, `success`, `failed`

Do not let provider success imply model success.

**Step 6: Persist `chat.default` when the primary model changes**

On primary-model selection, call:

```ts
await updateBinding({ bindingKey: "chat.default", providerModelId })
```

**Step 7: Run targeted frontend verification**

Run:

```bash
cd frontend && pnpm exec eslint src/components/workspace/settings/model-management --ext .ts,.tsx
```

Expected: no new lint errors in touched files.

**Step 8: Commit**

```bash
git add frontend/src/components/workspace/settings/model-management/provider-detail.tsx \
  frontend/src/components/workspace/settings/model-management/provider-model-list.tsx \
  frontend/src/components/workspace/settings/model-management/provider-credentials-form.tsx \
  frontend/src/components/workspace/settings/model-management/provider-detail.test.tsx
git commit -m "Implement provider detail and model actions"
```

## Task 10: Repoint Model Consumers in Other Settings Sections

**Files:**
- Modify: `frontend/src/components/workspace/settings/configuration/sections/title-section.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/suggestions-section.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/summarization-section.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/title-section.tsx`
- Test: `frontend/src/components/workspace/settings/configuration/sections/title-section.test.tsx`
- Test: `frontend/src/components/workspace/settings/configuration/sections/suggestions-section.test.tsx`
- Test: `frontend/src/components/workspace/settings/configuration/sections/summarization-section.test.tsx`

**Step 1: Write the failing selector tests**

Example:

```ts
test("title section reads runtime models instead of config.models", () => {
  render(<TitleSection ... />);
  expect(screen.getByText("GPT-4.1")).toBeInTheDocument();
});
```

Mock runtime-model hook output instead of stuffing `config.models`.

**Step 2: Run the selector tests to verify failure**

Expected: FAIL because these sections still read `config.models`.

**Step 3: Replace `config.models` selectors with runtime model hooks**

Update each section to consume:

```ts
const { models } = useModels();
```

or a more explicit runtime-model hook if created in Task 7.

**Step 4: Keep page-owned settings values focused on binding ids**

If any section currently writes raw model names into config, convert it to binding-aware or runtime-model-id-aware values.

**Step 5: Run targeted frontend verification**

Run:

```bash
cd frontend && pnpm exec eslint \
  src/components/workspace/settings/configuration/sections/title-section.tsx \
  src/components/workspace/settings/configuration/sections/suggestions-section.tsx \
  src/components/workspace/settings/configuration/sections/summarization-section.tsx \
  --ext .ts,.tsx
```

Expected: no new lint errors in touched files.

**Step 6: Commit**

```bash
git add frontend/src/components/workspace/settings/configuration/sections/title-section.tsx \
  frontend/src/components/workspace/settings/configuration/sections/suggestions-section.tsx \
  frontend/src/components/workspace/settings/configuration/sections/summarization-section.tsx \
  frontend/src/components/workspace/settings/configuration/sections/title-section.test.tsx \
  frontend/src/components/workspace/settings/configuration/sections/suggestions-section.test.tsx \
  frontend/src/components/workspace/settings/configuration/sections/summarization-section.test.tsx
git commit -m "Repoint settings model selectors to runtime catalog"
```

## Task 11: Remove the Legacy Model Editor Path and Update Docs

**Files:**
- Modify: `frontend/src/components/workspace/settings/configuration/sections/models/index.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/models/utils.ts`
- Modify: `backend/CLAUDE.md`
- Modify: `backend/docs/API.md`
- Modify: `README.md`

**Step 1: Write the failing cleanup assertion**

Add or update a test proving the settings page no longer depends on `normalizeModelProviderConfig` and legacy provider editor state.

**Step 2: Run the cleanup test to verify failure**

Expected: FAIL because old code is still referenced.

**Step 3: Delete or dead-path the obsolete settings-editor logic**

If the new page no longer imports:

- `ModelsSection`
- `normalizeModelProviderConfig`

remove the now-unused legacy paths or mark them internal-only until follow-up deletion can be done safely.

Prefer deletion over compatibility wrappers.

**Step 4: Update docs**

Document the new reality:

- built-in providers live in database seed records
- runtime model resolution uses registry service
- `/api/model-admin/*` is the settings/admin surface
- `/api/models` is now runtime-catalog compatibility

**Step 5: Run the final targeted verification**

Run:

```bash
cd backend && uv run pytest \
  tests/test_model_management_repository.py \
  tests/test_model_management_seed.py \
  tests/test_model_management_crypto.py \
  tests/test_model_registry_service.py \
  tests/test_model_admin_router.py \
  tests/test_model_management_legacy_import.py \
  tests/test_model_config_validation.py -q

pnpm frontend:check
```

Expected:

- backend tests PASS
- frontend check may still report unrelated pre-existing failures; the touched model-management files must not add new errors

**Step 6: Commit**

```bash
git add frontend/src/components/workspace/settings/configuration/sections/models \
  backend/CLAUDE.md \
  backend/docs/API.md \
  README.md
git commit -m "Delete legacy model-editor path and document registry-backed flow"
```

## Final Integration Check

Before merging, manually verify in the isolated worktree:

1. Open the model settings page.
2. Confirm the page opens in marketplace view.
3. Add a built-in provider instance.
4. Test the provider connection.
5. Discover models and add at least one model.
6. Test the chosen model.
7. Mark a primary model and confirm `chat.default` is updated.
8. Re-open the page and confirm state persisted.
9. Confirm chat runtime resolves the chosen default model.

## Suggested Execution Order

Run Tasks 1 through 6 in backend-first order before touching frontend UI. Only start Tasks 8 through 10 once Task 5 management APIs and Task 6 legacy import are merged locally and passing. Leave Task 11 for the end so cleanup only happens after the replacement path is working.
