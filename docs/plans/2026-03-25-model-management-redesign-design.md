# Model Management Redesign Design

## Goal

Replace the current config-editor-style model settings page with a database-driven model management system that is understandable to non-technical users, stores both built-in and user-created providers in the database, and lets the runtime read model availability directly from database records instead of `models[]` and `model_providers[]`.

## Product Decisions

- Built-in providers are database records, not frontend or backend constants.
- User-added provider instances, API keys, selected models, test results, and display state are all stored in the database.
- Provider testing and model testing are separate actions with separate statuses.
- Entering the model settings page defaults to the provider marketplace view, not a raw configuration form.
- The left column always shows added provider instances.
- The right panel shows either:
  - provider marketplace
  - built-in provider detail
  - custom provider detail
- Runtime model resolution reads from the new database tables through a registry service. It no longer treats `models[]` as the source of truth.

## Current-State Problem

The current page in [model-settings-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/model-settings-page.tsx) is still a config editor over a normalized settings payload. It exposes provider protocol, base URL, and model wiring as technical fields. That matches the current config center architecture, but it does not match the mental model of ordinary users.

The current backend already exposes useful primitives:

- provider connection test in [models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/models.py)
- provider model discovery in [models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/models.py)
- models.dev metadata lookup in [models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/models.py)

Those capabilities should be preserved, but the source of truth should move from config blob editing to relational model management.

## Target UX

The model settings page becomes a provider-first resource manager.

Left column:

- all added provider instances
- each item shows provider name, primary model, enabled state, and latest provider health
- bottom-fixed `Add Provider` entry

Right panel default:

- provider marketplace with four tabs:
  - domestic
  - aggregator
  - global
  - local
- cards for system provider templates
- activated templates appear disabled when duplicates are not allowed

Right panel when a provider instance is selected:

- built-in provider instances show only the editable fields allowed by the template
- custom provider instances show the full connection form
- lower section shows models under that provider instance
- `Add Model` prefers multi-select from discovered provider models
- if discovery is not available, fall back to manual model entry

Provider flow:

1. choose provider template
2. input API key or required credentials
3. test provider connection
4. discover models if supported
5. select or manually add models
6. test specific models
7. mark one primary model and save

## Database Model

The system should use dedicated relational tables instead of storing model management inside the generic config payload.

### `provider_templates`

System-owned provider definitions.

Key fields:

- `id`
- `code`
- `name`
- `description`
- `category`
- `icon`
- `protocol`
- `base_url_mode` (`fixed`, `editable`, `hidden`)
- `base_url`
- `api_key_apply_url`
- `supports_model_discovery`
- `discovery_mode` (`api`, `static`, `manual`, `none`)
- `allows_multiple_instances`
- `requires_api_key`
- `editable_schema_json`
- `badge`
- `network_notice`
- `is_builtin`
- `status`
- `sort_order`
- `created_at`
- `updated_at`

This table is seeded by migrations. It remains fully database-backed so a future admin system can manage it.

### `provider_template_category_memberships`

Allows one template to appear in one or more marketplace tabs.

Key fields:

- `provider_template_id`
- `category`
- `sort_order`

This is needed because the special `Custom Provider` card appears in every tab.

### `provider_instances`

User-created provider accounts or endpoints.

Key fields:

- `id`
- `provider_template_id` nullable for fully custom provider records
- `kind` (`builtin`, `custom`)
- `display_name`
- `protocol_override`
- `base_url_override`
- `custom_headers_json`
- `api_key_encrypted`
- `api_key_masked`
- `auth_config_json`
- `status` (`active`, `disabled`, `draft`, `error`)
- `provider_test_status` (`untested`, `success`, `failed`)
- `provider_test_message`
- `provider_test_latency_ms`
- `provider_last_tested_at`
- `last_discovery_at`
- `last_discovery_status`
- `last_discovery_message`
- `notes`
- `created_at`
- `updated_at`

API keys must be encrypted at rest. Masked values are stored separately for fast UI display.

### `provider_models`

Models enabled under a provider instance.

Key fields:

- `id`
- `provider_instance_id`
- `model_id`
- `display_name`
- `model_type`
- `source` (`seeded`, `discovered`, `manual`)
- `is_enabled`
- `is_primary`
- `priority_order`
- `supports_thinking`
- `supports_reasoning_effort`
- `supports_vision`
- `supports_video`
- `context_window`
- `max_output_tokens`
- `metadata_json`
- `model_test_status` (`untested`, `success`, `failed`)
- `model_test_message`
- `model_test_latency_ms`
- `model_test_preview`
- `model_last_tested_at`
- `created_at`
- `updated_at`

### `provider_discovery_cache`

Stores the raw and normalized results of a model discovery run.

Key fields:

- `id`
- `provider_instance_id`
- `fetched_at`
- `provider_type`
- `raw_payload_json`
- `normalized_models_json`
- `message`

This table is optional for first release, but useful for debugging and future admin tooling.

### `model_bindings`

Stores runtime usage targets instead of assuming one global default.

Key fields:

- `id`
- `binding_key`
- `provider_model_id`
- `fallback_provider_model_id`
- `status`
- `created_at`
- `updated_at`

Example `binding_key` values:

- `chat.default`
- `title.default`
- `suggestions.default`
- `search.summary`

## Seeded Provider Templates

Initial seed data should reflect the supplied marketplace structure.

### Domestic

- `minimax-cn`
- `zhipu`
- `deepseek`
- `stepfun`
- `longcat`
- `kimi-coding-plan`
- `moonshot-cn`
- `bailian-coding-plan`
- `bailing`
- `mimo`
- `custom-provider`

### Aggregator

- `doubao`
- `modelscope`
- `siliconflow-cn`
- `custom-provider`

### Global

- `minimax-global`
- `z-ai`
- `openrouter`
- `siliconflow-global`
- `zenmux`
- `aihubmix`
- `nvidia-build`
- `dmxapi`
- `groq`
- `cerebras`
- `custom-provider`

### Local

- `ollama`
- `lm-studio`
- `custom-provider`

Notes:

- `custom-provider` is one logical template that is visible in every category through `provider_template_category_memberships`.
- Records such as `moonshot-cn` and `kimi-coding-plan` should be separate templates if their acquisition link, default model, or user guidance differ.
- Templates may carry `network_notice` metadata. The global tab should use this for the TUN/network warning.

## Runtime Architecture

The runtime should no longer build chat models from generic config records stored in `AppConfig.models`.

Introduce a `ModelRegistryService` responsible for:

1. loading active provider instances and models from the database
2. resolving encrypted credentials
3. building runtime-ready provider descriptors
4. exposing lookup by:
   - `provider_model_id`
   - `binding_key`
5. caching and refreshing the registry safely

Runtime-facing code should request a model by binding or model record id, not by loose config fragments.

Example flow:

1. chat service requests `binding_key = "chat.default"`
2. `ModelRegistryService` resolves the bound `provider_models` row
3. service loads the parent `provider_instances` row and merged template data
4. service builds the concrete LangChain provider client
5. request executes against that client

This architecture keeps UI, admin tooling, and runtime aligned on one source of truth.

## API Design

Split APIs into management APIs and runtime APIs.

### Management APIs

Used by settings UI and future admin surfaces.

- `GET /api/model-admin/templates`
- `GET /api/model-admin/templates?category=domestic`
- `GET /api/model-admin/providers`
- `POST /api/model-admin/providers`
- `PATCH /api/model-admin/providers/:id`
- `DELETE /api/model-admin/providers/:id`
- `POST /api/model-admin/providers/:id/test`
- `POST /api/model-admin/providers/:id/discover-models`
- `POST /api/model-admin/providers/:id/models`
- `PATCH /api/model-admin/models/:id`
- `DELETE /api/model-admin/models/:id`
- `POST /api/model-admin/models/:id/test`
- `GET /api/model-admin/bindings`
- `PUT /api/model-admin/bindings/:binding_key`

### Runtime APIs

Used by chat and internal runtime consumers.

- `GET /api/runtime/models`
- `GET /api/runtime/models/:id`
- `GET /api/runtime/bindings`

## Provider and Model Testing

Provider testing and model testing must remain distinct.

### Provider test

Purpose:

- validate credentials
- validate connectivity
- validate provider protocol selection
- optionally validate model-discovery capability

Rules:

- never implies that a specific model works
- should prefer model-list probe when supported
- if provider listing is unsupported but auth succeeds, return success with manual model guidance

UI statuses:

- `untested`
- `success`
- `failed`

### Model test

Purpose:

- validate one concrete model id under one provider instance

Rules:

- uses the provider instance credentials plus selected model id
- sends a minimal probe message
- records latency and short preview
- should be available from each model row

UI statuses:

- `untested`
- `success`
- `failed`

## UI State Machine

The page should use a small explicit state machine.

Primary states:

- `marketplace`
- `provider_detail`
- `custom_provider_create`

Substates inside `provider_detail`:

- `credentials`
- `models`
- `provider_testing`
- `model_testing`

The old `providers` vs `models` top-level split should be removed. For users, provider management and model management are one continuous flow.

## Built-In vs Custom Provider Rules

Built-in provider instances:

- inherit display metadata from the template
- hide fixed technical fields such as immutable base URL
- expose `Get API Key` link from the template record
- may block duplicate activation if `allows_multiple_instances = false`

Custom provider instances:

- expose editable display name
- expose protocol selector
- expose editable base URL
- expose optional custom headers
- default to manual model entry if discovery is unsupported

Local providers:

- `ollama` and `lm-studio` should support no-key flows when appropriate
- provider templates should encode whether an API key is required

## Migration Strategy

This redesign should ship in stages, but the target state remains database truth.

### Phase 1: Schema and seed

- add new tables
- seed built-in provider templates
- add encryption support for provider credentials

### Phase 2: Registry service

- introduce `ModelRegistryService`
- add runtime lookup by `binding_key`
- switch runtime model construction to registry-based resolution

### Phase 3: Management APIs

- add CRUD for templates, instances, models, and bindings
- move provider test and model test endpoints under model-admin

### Phase 4: Settings page rewrite

- replace current config-editor page with provider marketplace + detail flow
- wire page to management APIs

### Phase 5: Legacy import and cleanup

- provide one-time migration from legacy config records into the new tables
- delete old model editor paths and stale config normalization logic

## Security

- API keys must be encrypted at rest before being written to SQLite.
- Logs and error messages must never expose decrypted secrets.
- Test endpoints must sanitize upstream provider error messages.
- UI should only ever display masked credentials.

## Validation and Testing

### Backend

- migration tests for new schema
- seed tests for built-in templates
- CRUD tests for provider instances and models
- provider test endpoint tests
- model test endpoint tests
- registry resolution tests by `binding_key`
- encrypted credential round-trip tests

### Frontend

- marketplace tab rendering by category
- add built-in provider flow
- add custom provider flow
- discover models and select multiple models
- manual model entry fallback
- provider test feedback
- model row test feedback
- duplicate template disabling behavior

### E2E

- add MiniMax and test provider
- add models from discovery result and mark one primary
- add custom provider and manual model id
- verify active chat binding switches to the newly chosen model

## Non-Goals

- Do not preserve `models[]` and `model_providers[]` as a long-term runtime source.
- Do not keep the current config-editor UX as a parallel path.
- Do not store built-in provider definitions in frontend constants.
- Do not collapse provider test and model test into one ambiguous action.

## Recommended Next Step

Write a concrete implementation plan covering:

1. database schema and seed migration
2. registry service and runtime integration
3. management APIs
4. settings page rewrite
5. legacy import and cleanup

That plan should execute against the new database-backed architecture directly instead of extending the current config-centered page.
