# Settings Config Center Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `config.yaml` with page-managed configuration, reproducing the `Nion-Agent` settings UX and config-center workflow in the current `nion` repo, while also aligning the donor chat runtime, composer, workdir, and plugin-creation behaviors that depend on those settings.

**Architecture:** Use a `Nion-Agent`-style Config Center as the single source of truth: backend versioned config store + validate/update API + frontend config editor + sectioned settings dialog. Do not import legacy `config.yaml`; bootstrap an empty/default config store and require all future edits to go through the UI/API. Treat the current repo as a single-assistant product with one app workspace rooted at `~/.nion-data/workspace`; distinguish that from each thread's sandbox workdir under `{base_dir}/threads/{thread_id}/user-data/workdir`. For runtime mode, keep the donor's sandbox/host product language, but adapt it for web: host mode is valid in web deployments and maps to backend/server host execution; explicit host-directory binding stays optional and only applies when the conversation intentionally targets a host path. For channels, keep the current repo's platform connectors, `ChannelManager`, and chat delivery path as the primary execution backbone, then selectively graft in `Nion-Agent` capabilities for pairing, authorization, session overrides, runtime status, message logs, webhook/stream mode management, and operator observability. Keep the current repo memory system unchanged; do not migrate to `Nion-Agent` memory or retrieval architecture.

**Tech Stack:** FastAPI, Pydantic, SQLite-backed config store, React/Next.js, TanStack Query, shadcn/ui, runtime profile services, workbench/plugin services, existing DeerFlow/Nion backend services

---

## Locked Decisions

- Do **not** migrate or import existing `config.yaml`.
- Page settings and Config Center API become the only supported configuration write path.
- UI grouping, information architecture, and interaction style should follow `Nion-Agent`.
- This repo's default app data root should be `~/.nion-data`, not `~/.nion`.
- Keep a single app-workspace model for this repo. Do not introduce multi-workspace management UI in this migration.
- The donor chat-composer contract is in scope, including the four shortcut lanes: `Context`, `Skill`, `MCP`, and `CLI`.
- The donor plugin parity target includes plugin creation/debug/package flow, not only the settings list page.
- The earlier "workspace switcher is presentational only" and "working-directory panel is plumbing only" assumptions are superseded by this plan.
- Vector / embedding configuration is explicitly deferred for now.
- Current repo channel connection and chat execution logic remains primary.
- `Nion-Agent` channel features are supplemental and should be transplanted selectively.
- Current repo memory module remains primary and unchanged.
- Do **not** migrate to `Nion-Agent` memory or retrieval architecture.

## Reference Sources

Use these files as the primary transplant references:

- Config Center backend:
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/app/gateway/routers/config.py`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/packages/harness/nion/config/config_repository.py`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/packages/harness/nion/config/app_config.py`
- Settings dialog shell:
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/settings-dialog.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/settings-sections.ts`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/use-config-editor.ts`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/config-center/api.ts`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/config-center/hooks.ts`
- Chat runtime / workspace donor:
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/app/workspace/chats/[thread_id]/page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/new-chat-stage.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/runtime-mode-toggle.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/artifacts/working-directory-trigger.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/input-box/index.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/app/gateway/routers/runtime_profile.py`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/packages/harness/nion/runtime_profile/repository.py`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/packages/harness/nion/config/paths.py`
- Core settings sections:
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/model-settings-page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/session-policy-settings-page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/mcp-servers-page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/sandbox-settings-page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/search-settings-page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/cli-tools-page.tsx`
- Workbench / plugin donor:
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/workbench-plugins-page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/app/workspace/plugins/assistant/page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/workbench/hooks.ts`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/workbench/loader.ts`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/workbench/marketplace.ts`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/app/gateway/routers/workbench/plugin_studio.py`
- Channel target architecture:
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/settings/channel-settings-page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/channels/api.ts`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/channels/hooks.ts`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/app/channels/repository.py`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/app/channels/runtime_manager.py`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/app/channels/incoming_service.py`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/app/channels/bridge_service.py`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/backend/app/gateway/routers/channels.py`

## Channel Comparison

### Verdict

Overall, `Nion-Agent` channel capability is substantially more complete than the current repo. The current repo only wins on two narrow points:

- it already supports `Slack`
- it has simple in-channel slash-command helpers (`/new`, `/status`, `/models`, `/memory`, `/help`)

For configuration depth, runtime governance, authorization, workspace routing, and observability, `Nion-Agent` is the stronger source of missing capabilities. But the current repo remains the canonical runtime backbone for actual channel connection and chat flow.

### Current Repo Channel Strengths

- Simple end-to-end chat path is already working for `Feishu`, `Slack`, and `Telegram`.
- Direct `ChannelManager` orchestration is easy to reason about:
  - [manager.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/channels/manager.py)
- Supports basic per-channel and per-user session overrides from `config.yaml`.
- Supports file delivery fallback and Feishu incremental streaming card updates.
- Has lightweight command routing via Gateway:
  - `/new`
  - `/status`
  - `/models`
  - `/memory`
  - `/help`

### Current Repo Channel Gaps

- Config source is still `config.yaml` only; no page-based edit path.
- `channels` is not a first-class typed config section in `AppConfig`; it is carried via `extra="allow"`.
- Persistence is a single JSON thread-mapping file:
  - [store.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/channels/store.py)
- No pairing codes, approval queue, authorized user registry, workspace binding, or per-user session-override UI.
- No runtime state model beyond `enabled/running`.
- No delivery logs, render mode metadata, fallback reason tracking, or SSE event stream for operator UI.
- No webhook/stream dual-mode control plane.

### `Nion-Agent` Channel Strengths

- Typed integration config per platform with `enabled`, `mode`, `credentials`, `default_workspace_id`, and `session`.
- Persistent relational storage for:
  - integrations
  - pairing codes
  - pair requests
  - authorized users
  - chat thread bindings
  - message logs
- Runtime manager with `healthy/degraded/down` state, reconnection count, connection timestamps, and last-delivery metadata.
- Shared inbound flow that handles:
  - dedup
  - pairing
  - authorization
  - workspace resolution
  - session override resolution
  - bridge delivery
- Operator-facing APIs and UI for:
  - connection tests
  - pairing approval/rejection
  - authorized-user revoke
  - authorized-user workspace update
  - authorized-user session override
  - runtime SSE stream
- Better DingTalk coverage and explicit webhook/stream mode management.

### Recommended Channel Strategy

- Keep the current repo's `ChannelManager`, `Channel` base class, and platform connectors (`feishu.py`, `slack.py`, `telegram.py`) as the main connection and chat orchestration path.
- Port selected `Nion-Agent` control-plane capabilities into the current system:
  - typed channel config
  - pairing and authorization
  - workspace binding
  - per-user session override
  - runtime health/status
  - message logs and delivery metadata
  - webhook/stream dual-mode control
  - operator SSE/event observability
- Preserve current-repo `Slack` support as a first-class platform.
- Preserve current slash-command affordances unless they conflict with the new control plane.

## Scope Breakdown

### Required For `config.yaml` Retirement

- Config store and Config Center API
- Frontend Config Center client
- Default repo data root move to `~/.nion-data`
- Thread runtime profile and path-resolution layer for sandbox/host semantics
- Chat-page working-directory / runtime toggle / composer parity foundation
- Settings dialog parity for:
  - appearance
  - notification
  - models
  - session policy
  - tools
  - MCP servers
  - skills
  - sandbox
- Startup/runtime changes so backend loads config from store, not YAML
- Docs and copy updates removing YAML-first guidance

### Required For `Nion-Agent` Settings Parity

- Search settings page and its backing service/config model
- CLI tools page and supporting backend/frontend modules
- Workbench plugin registry, install/load/enable/disable, and supporting backend/frontend modules
- Plugin assistant / plugin studio creation-debug-package flow
- Runtime diagnostics page for both web-host and desktop-host environments
- Channel control plane page and supplemental backend architecture

### Explicitly Preserved

- Current repo memory backend and memory data model
- Current repo channel connection drivers and chat message flow
- Current repo `Slack` support

### Explicitly Deferred

- Embedding / vector model configuration
- Retrieval-model section
- `Nion-Agent` memory center, memory governance flow, and retrieval-backed memory stack

## Task 1: Build Backend Config Store Foundation

**Files:**
- Create: `backend/packages/harness/deerflow/config/config_store.py`
- Create: `backend/packages/harness/deerflow/config/config_repository.py`
- Modify: `backend/packages/harness/deerflow/config/app_config.py`
- Modify: `backend/packages/harness/deerflow/config/__init__.py`
- Test: `backend/tests/test_config_store.py`
- Test: `backend/tests/test_config_repository.py`
- Test: `backend/tests/test_app_config_store_bootstrap.py`

**Step 1: Write failing tests for store bootstrap and versioning**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_config_store.py tests/test_config_repository.py tests/test_app_config_store_bootstrap.py -q
```

Expected:

- tests fail because store/repository/bootstrap support does not exist yet

**Step 2: Implement a versioned config store**

Requirements:

- persist config in SQLite
- support `read`, `write(expected_version=...)`, and runtime-status metadata
- bootstrap default config when store is empty
- no YAML import path

**Step 3: Make `AppConfig` load from store instead of `config.yaml`**

Requirements:

- empty store must return a minimal valid config
- `get_app_config()` and reload helpers must read store-backed data
- error messages should stop telling users to edit `config.yaml`

**Step 4: Re-run backend store tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_config_store.py tests/test_config_repository.py tests/test_app_config_store_bootstrap.py -q
```

Expected:

- all new config-store tests pass

## Task 2: Normalize Config Schema For UI Editing

**Files:**
- Create: `backend/packages/harness/deerflow/config/channels_config.py`
- Create: `backend/packages/harness/deerflow/config/suggestions_config.py`
- Modify: `backend/packages/harness/deerflow/config/app_config.py`
- Test: `backend/tests/test_app_config_validation.py`

**Step 1: Write failing validation tests for typed sections**

Focus on:

- `channels`
- `suggestions`
- existing sections already exposed in UI

**Step 2: Add typed config models for fields that are currently implicit or extra-only**

Requirements:

- channel config must become first-class and validated
- suggestions/session-policy config should be typed so the frontend can edit it safely
- avoid keeping critical UI sections in `model_extra`

**Step 3: Verify validation behavior**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_app_config_validation.py -q
```

Expected:

- new typed config sections validate cleanly

## Task 3: Expose Config Center API In Gateway

**Files:**
- Create: `backend/app/gateway/routers/config.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Modify: `backend/app/gateway/app.py`
- Test: `backend/tests/test_gateway_config_api.py`

**Step 1: Write failing API tests**

Cover:

- `GET /api/config`
- `GET /api/config/schema`
- `POST /api/config/validate`
- `PUT /api/config`
- `GET /api/config/runtime-status`

**Step 2: Port the `Nion-Agent` router shape**

Requirements:

- optimistic locking by version
- validation warnings/errors payload
- runtime status payload for operator visibility
- section metadata for frontend rendering

**Step 3: Update backend copy away from YAML**

Examples:

- lead-agent “no model configured” errors
- startup failure guidance
- any API docs mentioning YAML as the primary path

**Step 4: Verify gateway API**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_gateway_config_api.py -q
```

Expected:

- config endpoints behave like `Nion-Agent`

## Task 4: Port Frontend Config Center Backbone

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

**Step 1: Write failing frontend typecheck baseline**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm typecheck
```

Expected:

- new imports/modules are missing

**Step 2: Port `Nion-Agent` settings shell**

Requirements:

- grouped nav structure
- section parsing helpers
- dialog context for cross-section jumps
- `Nion-Agent` visual hierarchy and interaction rhythm

**Step 3: Add Config Center client hooks**

Requirements:

- query config/schema/runtime status
- validate/save mutations
- cache invalidation for models and other dependent queries

**Step 4: Update locale dictionaries for new settings groups**

Include copy for:

- nav groups
- models
- session policy
- sandbox
- MCP servers
- search settings
- CLI tools
- channels

**Step 5: Verify typecheck**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm typecheck
```

Expected:

- Config Center shell compiles

## Task 4A: Port Chat Runtime, Composer, And Workspace Foundation

**Files:**
- Create or port: `backend/app/gateway/routers/runtime_profile.py`
- Create or port: `backend/packages/harness/deerflow/runtime_profile/__init__.py`
- Create or port: `backend/packages/harness/deerflow/runtime_profile/repository.py`
- Modify: `backend/packages/harness/deerflow/config/paths.py`
- Modify: `backend/packages/harness/deerflow/agents/middlewares/thread_data_middleware.py`
- Modify: `backend/app/gateway/path_utils.py`
- Modify: `backend/app/gateway/routers/uploads.py`
- Modify: `backend/app/gateway/routers/artifacts.py`
- Create or port: `frontend/src/core/runtime/index.ts`
- Create or port: `frontend/src/core/runtime/profile.ts`
- Create: `frontend/src/components/workspace/new-chat-stage.tsx`
- Create: `frontend/src/components/workspace/runtime-mode-toggle.tsx`
- Create: `frontend/src/components/workspace/artifacts/working-directory-trigger.tsx`
- Create: `frontend/src/components/workspace/workspace-switcher.tsx`
- Modify: `frontend/src/app/workspace/chats/[thread_id]/page.tsx`
- Modify: `frontend/src/components/workspace/chats/chat-box.tsx`
- Modify: `frontend/src/components/workspace/input-box.tsx`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/message-group.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list-item.tsx`

**Step 1: Normalize workspace semantics**

Requirements:

- default this repo's data root to `~/.nion-data`
- distinguish app workspace, thread workdir, and optional host-bound directory
- keep the product on a single app-workspace model for now

**Step 2: Port donor runtime-profile behavior with web adaptation**

Requirements:

- expose sandbox/host mode through thread-scoped runtime profile APIs
- allow web host mode as backend-host execution
- do not force directory selection up front for web host mode
- only route file IO into a bound host directory when the conversation explicitly binds one

**Step 3: Port donor chat shell and working-directory panel**

Requirements:

- top-right working-directory trigger
- centered runtime toggle
- floating new-chat stage
- real working-directory panel state instead of placeholder plumbing

**Step 4: Port the four composer shortcut lanes**

Requirements:

- `Context`, `Skill`, `MCP`, and `CLI` lanes must match donor UI and state flow
- outgoing messages must preserve implicit mention metadata and requested skills
- invoked selections should remain visible/diagnosable in the message bubble/tool-result flow

## Task 5: Port Core Config-Editing Sections

**Files:**
- Create: `frontend/src/components/workspace/settings/model-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/session-policy-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/mcp-servers-page.tsx`
- Create: `frontend/src/components/workspace/settings/sandbox-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/config-save-bar.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/field-tip.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/shared.ts`
- Create: `frontend/src/components/workspace/settings/configuration/sections/models/index.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/tools-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/checkpointer-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/subagents-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/suggestions-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/summarization-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/title-section.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`

**Step 1: Port model management first**

Requirements:

- provider-first model editing flow
- default model visibility
- validation/save bar

**Step 2: Port session policy group**

Requirements:

- title generation
- suggestions
- summarization
- subagent timeout/overrides

**Step 3: Split tools and MCP servers into separate sections**

Requirements:

- built-in tool config editing
- MCP server config remains on the extensions path but uses `Nion-Agent` page shape

**Step 4: Port sandbox/checkpointer editing**

Requirements:

- present only supported choices in current repo
- do not expose deferred or unsupported backend options

**Step 5: Verify frontend quality**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Expected:

- lint and typecheck pass for the new sections

## Task 6: Port Extended Settings Pages Needed For Full Parity

**Files:**
- Create or port: `frontend/src/components/workspace/settings/search-settings-page.tsx`
- Create or port supporting backend/frontend search-provider modules
- Create or port: `frontend/src/components/workspace/settings/cli-tools-page.tsx`
- Create or port supporting `frontend/src/core/cli/*` and backend CLI APIs
- Create or port: `frontend/src/components/workspace/settings/workbench-plugins-page.tsx`
- Create or port supporting plugin APIs
- Create or port: `frontend/src/components/workspace/settings/desktop-runtime-settings-page.tsx`

**Step 1: Port search settings only after backend capability mapping is clear**

Requirements:

- do not fake provider support
- map current repo search/tool capabilities to the `Nion-Agent` UX

**Step 2: Port CLI tools and workbench plugins as a feature lane**

Requirements:

- only ship when the supporting backend/runtime modules are present
- for workbench parity, include plugin registry/package/runtime plus plugin-studio session flow rather than a settings list page only
- if backend parity is missing, gate the nav item instead of shipping a dead page

**Step 3: Keep embedding/retrieval hidden**

Requirements:

- do not render vector-model pages in nav
- do not create partial UI for deferred capabilities

## Task 7: Augment The Current Channel Stack With `Nion-Agent`-Style Control-Plane Features

**Files:**
- Create or port: `backend/app/channels/db.py`
- Create or port: `backend/app/channels/repository.py`
- Create or port: `backend/app/channels/runtime_manager.py`
- Create or port: `backend/app/channels/incoming_service.py`
- Create or port: `backend/app/channels/bridge_service.py`
- Create or port: `backend/app/channels/connection_service.py`
- Create or port: `backend/app/channels/webhook_service.py`
- Modify: `backend/app/gateway/routers/channels.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/channels/manager.py`
- Modify: `backend/app/channels/service.py`
- Modify: `backend/app/channels/feishu.py`
- Modify: `backend/app/channels/slack.py`
- Modify: `backend/app/channels/telegram.py`
- Create: `frontend/src/core/channels/api.ts`
- Create: `frontend/src/core/channels/hooks.ts`
- Create: `frontend/src/core/channels/types.ts`
- Create: `frontend/src/core/channels/index.ts`
- Create: `frontend/src/components/workspace/settings/channel-settings-page.tsx`
- Create: `frontend/src/app/workspace/manage/channels/page.tsx`

**Step 1: Write failing backend channel tests around the target control plane**

Cover:

- platform config CRUD
- runtime status
- connection test
- pairing code lifecycle
- pair request approve/reject
- authorized user list/revoke/update

**Step 2: Port repository/runtime/inbound bridge capabilities from `Nion-Agent`**

Requirements:

- workspace binding
- per-user authorization
- per-user session override
- message log metadata
- delivery-path and render-mode tracking
- stream/webhook mode awareness
- integrate these around the current repo's channel runtime instead of replacing it wholesale

**Step 3: Keep current channel execution flow as the primary runtime**

Requirements:

- `ChannelManager` remains the main chat dispatcher unless a very specific capability cannot fit it
- existing platform-specific send/receive logic should stay in `feishu.py`, `slack.py`, and `telegram.py`
- new repository/runtime status/logging modules should feed and enrich the existing flow
- do not regress current `Slack` support

**Step 4: Port `Nion-Agent` channel page UX**

Requirements:

- per-platform tabs
- connection test
- runtime health card
- pairing/authorization section
- authorized users panel
- session override editor

**Step 5: Reconcile current command affordances**

Requirements:

- keep `/new`, `/status`, `/models`, `/memory`, `/help` unless a concrete incompatibility is found
- if backend data sources change, adapt those commands to the new storage/runtime metadata without removing the current interaction model

## Task 8: Remove YAML-First Product Surface

**Files:**
- Modify: `README.md`
- Modify: `README_zh.md`
- Modify: `backend/CLAUDE.md`
- Modify or delete: `config.example.yaml`
- Modify: any startup/setup docs under `backend/docs/`

**Step 1: Remove YAML-first setup instructions**

Requirements:

- docs should point users to page settings / Config Center API
- commands should no longer tell users to copy/edit `config.yaml`

**Step 2: Decide final disposition of `config.example.yaml`**

Recommended:

- keep only as an internal schema snapshot during migration
- remove it from user-facing setup flow

**Step 3: Verify repo-wide copy**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
rg -n "config\\.yaml|config.example.yaml|Edit `config.yaml`|编辑 `config.yaml`" README.md README_zh.md backend docs frontend
```

Expected:

- no user-facing setup path still points at YAML as the primary config surface

## Final Verification Matrix

Run all of the following before calling the migration complete:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
rg -n "config\\.yaml" backend frontend README.md README_zh.md backend/docs
```

```bash
browser-use doctor
```

Then execute the relevant scenarios from:

- [2026-03-24-settings-e2e-browser-use-acceptance-spec.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-24-settings-e2e-browser-use-acceptance-spec.md)

Manual verification checklist:

- fresh boot with empty config store opens the app without requiring YAML
- settings dialog opens on the new grouped nav
- chat page shows runtime mode + working-directory controls with the intended web/desktop semantics
- composer exposes `Context`, `Skill`, `MCP`, and `CLI` shortcut lanes with visible message/bubble effects
- saving models/session policy/sandbox/tools works without restart
- model list updates after config save
- plugin settings can open or route into a real plugin creation/debug flow if the module is shipped
- channel page can save credentials and show runtime state
- no critical workflow requires editing a local YAML file
- required browser-use screenshots/logs are captured for shipped modules

## Suggested Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 4A
6. Task 5
7. Task 8
8. Task 7
9. Task 6

Rationale:

- Tasks 1-5 are the shortest path to retiring `config.yaml`.
- Task 8 removes the old product surface once the new one exists.
- Task 7 is large and should follow once the config backbone is stable.
- Task 6 contains parity pages that depend on more subsystems and should not block YAML retirement.
