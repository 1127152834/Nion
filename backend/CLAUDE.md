# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nion is a LangGraph-based AI super agent system with a full-stack architecture. The backend provides a "super agent" with sandbox execution, persistent memory, subagent delegation, governed custom-agent child runs, and extensible tool integration - all operating in per-thread isolated environments.

**Architecture**:
- **LangGraph Server** (port 2024): Agent runtime and workflow execution
- **Gateway API** (port 8001): REST API for models, MCP, skills, memory, artifacts, and uploads
- **Frontend** (port 3000): Next.js web interface
- **Nginx** (port 2026): Unified reverse proxy entry point
- **Provisioner** (port 8002, optional in Docker dev): Started only when sandbox is configured for provisioner/Kubernetes mode

## Important Development Guidelines

### Documentation Update Policy
**CRITICAL: Always update README.md and CLAUDE.md after every code change**

When making code changes, you MUST update the relevant documentation:
- Update `README.md` for user-facing changes (features, setup, usage instructions)
- Update `CLAUDE.md` for development changes (architecture, commands, workflows, internal systems)
- Keep documentation synchronized with the codebase at all times
- Ensure accuracy and timeliness of all documentation

Testing handoff docs for real business modules live under `docs/test/`.
If feature behavior, routes, or module boundaries change, update the relevant module document and the overview index at `docs/test/README.md`.

## Commands

**Root directory** (for full application):
```bash
make check
make install
make dev
make stop
```

**Backend directory**:
```bash
make install
make dev
make gateway
make test
make lint
make format
```

### Frontend Dev Workflow

- `make dev` and `pnpm --dir frontend dev` both use the frontend default dev script, which is `next dev --webpack`.
- Keep webpack-backed `next dev` as the default workflow to avoid the known Turbopack panic when the repository lives under a non-ASCII path.
- Only use `pnpm --dir frontend dev:turbo` when you are in an ASCII-safe path or explicitly debugging a Turbopack-only issue.
- The dev surface may be opened through `http://127.0.0.1:2026` or `http://localhost:2026`; `allowedDevOrigins` already allows both origins.
- When the frontend is run standalone on port `3000`, the gateway CORS allowlist must continue to permit both `http://localhost:3000` and `http://127.0.0.1:3000`, otherwise settings and memory fetches fail back to empty client defaults.

## Architecture

### Harness / App Split

The backend is split into two layers with a strict dependency direction:

- **Harness** (`packages/harness/nion/`): Publishable agent framework package (`nion-harness`). Import prefix: `nion.*`
- **App** (`app/`): Unpublished application code. Import prefix: `app.*`

**Dependency rule**: App imports nion, but nion never imports app.

### Gateway API

FastAPI application on port 8001 with health check at `GET /health`.

| Router | Endpoints |
|--------|-----------|
| **Config** (`/api/config`) | `GET /`; `GET /schema`; `GET /session-policy/options`; `POST /validate`; `PUT /`; `GET /runtime-status` |
| **Runtime Profile** (`/api/threads/{id}/runtime-profile`) | thread-scoped sandbox/host execution mode |
| **Files** (`/api/threads/{id}/files`) | thread workdir tree |
| **CLI** (`/api/cli/catalog`) | runtime-visible CLI catalog |
| **Model Admin** (`/api/model-admin`) | templates / providers / models / bindings |
| **Models** (`/api/models`) | runtime model catalog |
| **MCP** (`/api/mcp`) | MCP config surfaces |
| **Memory** (`/api/memory`) | memory data and config |
| **Memory Settings** (`/api/memory/settings`) | compatibility projection for memory retrieval state |
| **User Identity** (`/api/user-identity`) | stable user identity profile owner contract |
| **Notebook** (`/api/notebook`) | notebook CRUD / history / restore / inbox / import / asset archive |
| **Uploads** (`/api/threads/{id}/uploads`) | uploads list / delete |
| **Artifacts** (`/api/threads/{id}/artifacts`) | serve artifacts |
| **Suggestions** (`/api/threads/{id}/suggestions`) | follow-up question generation |
| **Child Runs** (`/api/threads/{id}/child-runs`) | temporary delegated custom-agent inspection surface |

Model registry rule:
- Provider catalog metadata such as `context_window` and `max_output_tokens` is reference data, not a guaranteed request-time contract.
- Do not automatically promote discovered `max_output_tokens` into runtime request `max_tokens`; only explicit user/runtime config should set request caps.
- The model factory must ignore obviously invalid request caps where `max_tokens >= context_window`.
- Custom provider connection health is signature-based: a saved success only remains valid while the normalized `protocol/base_url/api_key_masked` signature is unchanged. Any provider credential/base URL/protocol mutation must reset `provider_test_status` to `untested`.

Memory now uses `nion.memory_os.*` as the runtime memory backbone, and the repository contains these Memory OS pieces:
- metadata/artifact substrate
- prompt memory bridge
- continuity bridge
- heartbeat/self-maintenance skeleton
- `agent-owned automation` ownership controls
- soul artifact/runtime/governance/event stream bridge
- capability catalog / capability bridge actions / skill runtime governance

When extending memory in this repository:
- do not reintroduce runtime dependence on `memory.json` or legacy `nion.agents.memory.*`
- do not reintroduce the old provider-based memory / AutoDream product shell
- explicit user identity statements such as user name and mutual addressing must be extracted deterministically; do not let them collapse back into generic `address_style` only
- explicit long-term soul instructions such as answer style, values/boundaries, and relationship stance must write into stable soul directly; do not leave them in onboarding-only or prompt-only limbo
- current product surface expectation:
- `/workspace/memory` must stay as the single user-facing memory surface and only expose grouped user-facing memory content
- `/workspace/memory` must not expose governance, growth, ledger, evidence, runtime-trace, or soul-control routes
- `Settings > Identity` is the stable user-facing owner surface for long-lived user identity fields; do not fold it back into Memory or Soul control surfaces
- `Settings > Soul` owns stable soul settings; product routes must not reintroduce soul proposal or growth controls
  - `/workspace/automation/*` must distinguish `user-owned` vs `agent-owned`, and explain provenance/mutability in product language
- Memory/Soul hardening expectations:
  - Use `nion.memory_os.clock.utcnow_z()` for Memory OS time values.
  - Keep `growth_orchestrator.py` as the coordination layer for soul reflection, learning, procedure, and automation projections.
  - Keep `retention.py` as the archive/purge lifecycle owner; prompt context should keep reading only active records.
  - Keep `automation_bridge.py` as the Memory OS boundary for agent-owned / soul-driven automation provenance events.
  - Runtime memory packs must inject the stable `user_identity_profile` block before Soul stable layers when that profile exists.
  - Frontend memory/soul contract tests should be runnable through `pnpm test:contracts -- <test files...>`.
- Capability governance expectations:
  - `get_capability_catalog` is the first discovery surface when the agent or user needs to know what built-in capability lanes exist.
  - `get_capability_actions` is the second discovery surface for explicit bridge / activation actions.
  - Notebook is not memory; notebook content only becomes memory through an explicit bridge action.
  - Skill is a workflow package; when a requested skill matches, prefer `use_skill` before generic tools.
  - MCP is not the default first choice when notebook / memory / skill / CLI already match the task.
  - `context=fork` on active skills may affect delegated execution and subagent runtime configuration.

Soul product contract in this repository:

- `/api/user-identity` is the stable owner surface for user name, mutual addressing, and long-term communication preferences.
- `/api/user-identity` also owns stable extended identity fields such as `user_role`, `timezone`, `interaction_boundaries`, `long_term_background_summary`, and `user_aliases`.
- `PATCH /api/user-identity` is the field-level immediate write path for stable user identity updates.
- When `preferred_address_for_user` and `assistant_self_name` are both present, the stable profile should auto-derive `mutual_addressing_rule` unless the caller explicitly overrides it.
- Explicit user identity statements from the current user turn should write straight into the stable profile before continuity/runtime assembly; do not add proposal-confirmation indirection for this lane.
- `/api/memory` user-facing payload must project stable identity fields from `UserIdentityProfile` ahead of old `workContext / personalContext / topOfMind` context slots.
- Product-facing retrieval model ownership lives under `Settings > Models > Retrieval Models`, backed by `/api/retrieval-models/*`.
- `/api/memory/settings` is a compatibility projection for Memory retrieval state only; it must not regain ownership of embedding / reranker configuration actions.
- `Memory` and `Knowledge Base` are retrieval model consumers. They share the phase-1 active retrieval profile instead of maintaining independent model settings.
- Structured memory retrieval must treat vector search as best-effort. Remote embedding HTTP failures must degrade to lexical fallback instead of aborting the main chat submit path.
- OpenAI-compatible chat models must carry a finite request timeout at runtime. If config does not set `timeout` / `request_timeout`, the model factory should apply the default 30-second timeout so upstream stalls surface as normal thread-stream errors instead of indefinite loading.
- `/api/memory/soul` returns the stable settings-shaped payload used by `Settings > Soul`.
- `PATCH /api/memory/soul` is the preferred field-level write path for stable soul settings.
- Explicit long-term soul instructions from chat must reuse the same stable soul patch path as `/api/memory/soul`, not a sidecar proposal lane.
- `/api/memory/soul/apply` remains available as the bulk update path while the product surface is moving away from draft/apply flows.
- `adaptive_overlay` may still exist internally, but proposal / rollback / growth governance routes are not part of the product-facing API surface.
- `relationship_soul` remains a derived soul layer, not a new relationship truth source.
- 当前已确定下一阶段方向：`SOUL.md` / `IDENTITY.md` / `MEMORY.md` 将升级为文件原生主档，结构化存储与向量索引退到 projection / retrieval 层；详细指导见 `docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md`。
- 当前已落地的第一批实现：`/api/memory` public surface 不再暴露事实增删改与导入导出；`/api/identity/document` 与 `/api/soul/document` 已成为 whole-document markdown routes；聊天中的显式 Identity / Soul 写入会同步回写 `IDENTITY.md` / `SOUL.md` 文件主档。

Thread title handling:

- Treat `"Untitled"` as a placeholder state, not a user-confirmed title.
- Later stream snapshots may carry `"Untitled"` again, but they must not overwrite an existing non-placeholder thread title such as a manually renamed title.
- Background title generation should keep using the placeholder/non-placeholder distinction when deciding whether another title pass is allowed.

Custom-agent orchestration contract:

- Delegated custom-agent runs persist under the parent thread directory as ephemeral `child-runs/*.json` records, not as `thread.json` history.
- `/api/threads/search` must remain blind to child runs; inspection happens only through `/api/threads/{thread_id}/child-runs*`.
- `AgentConfig.delegation` is the explicit source of truth for delegated reply policy, memory-write defaults, and delegatable private skills.
- Mention-based delegated execution is separate from the built-in subagent registry and task-tool worker lane.
- Local same-runtime custom agents stay on the LangGraph/local execution path; ACP and A2A are only remote transport seams, not the default local coordination mechanism.

### Local Daemon Surface

The desktop local daemon reuses the gateway router modules directly. Keep its
route surface aligned with the renderer expectations, including:

- `/api/model-admin/*`
- `/api/threads/{thread_id}/runtime-profile`
- `/api/models`, `/api/config`, `/api/skills`, `/api/files`, `/api/cli/catalog`
- `/api/memory`
- `/api/daemon/clients/register`, `/api/daemon/clients/{client_id}/heartbeat`, `/api/daemon/clients/{client_id}`
- `/api/daemon/logs`, `/api/daemon/logs/tail`
- `/api/daemon/diagnostics`, `/api/daemon/diagnostics/threads/{thread_id}`, `/api/daemon/diagnostics/skills/{skill_name}`
- `/api/daemon/diagnostics/tasks/{task_id}`
- `/api/daemon/channels/*`

Desktop daemon client contract:

- Electron heartbeats must preserve a stable `client_id` across daemon replacement/restart.
- `POST /api/daemon/clients/{client_id}/heartbeat` may receive `client_type`; when a session is missing after daemon replacement, it should recover that same `client_id` instead of forcing the desktop shell into repeated `404 client not found`.
- `/api/daemon/runtime-info` must remain backward compatible for existing desktop consumers, but now also carries product-facing `guardian_mode` and `bridge_runtime` summary objects for Guardian Mode surfaces.
- `guardian_mode.status` is a bounded contract (`standing_by` | `busy` | `offline`), not a free-form string.
- Desktop bridge overview now has its own IPC contract: `DESKTOP_BRIDGE_IPC_CHANNELS.bridgeRuntimeInfo` / `bridge:get-runtime-info`.
  This is the single snapshot surface for renderer-side remote-entry overview consumers and should stay sourced from one `getBridgeRuntimeInfo()` assembly boundary in desktop main.
- Frontend runtime visibility rule: settings and bridge overview must build on the
  shared guardian runtime contract/hook layer instead of each page re-fetching
  and re-merging runtime state independently.

Runtime profile execution contract:

- Thread `runtime-profile` is not metadata-only. `execution_mode` / `host_workdir`
  must flow from thread submit context into embedded runtime context.
- In workspace runs, selected CLI tools are runtime prompt context, not user-visible
  message text. Do not reintroduce `<selected_cli_tools>` injection into human content.
- When local sandbox provider is active, `execution_mode=host` must enable host bash
  for both the lead agent and task/subagent execution paths; sandbox mode must keep
  the existing host-bash denial behavior.
- Upload routing is independent from `execution_mode`. For `LocalSandboxProvider`,
  thread uploads already live in host thread storage, so upload handling must skip
  `sandbox.update_file("/mnt/user-data/...")` and return only virtual-path metadata.
- Local file tools must honor `host_workdir` consistently. In host mode with a
  bound directory, `read_file` / `ls` / `write_file` / `str_replace` / `glob` /
  `grep` may resolve either `/mnt/user-data/*` virtual paths or absolute paths
  inside that bound host directory, but must still reject paths outside it.
- Bridge-triggered thread streams are part of the same runtime mainline. When a
  bridge binding carries a normalized working directory, bridge runs must pass
  `execution_mode=host` plus that normalized `host_workdir`; empty or whitespace
  workdir values must fall back to `execution_mode=sandbox` and `host_workdir=None`.
- `bridge` is now a first-class runtime surface name. If no explicit bridge
  surface policy is configured, it must inherit the `channel` rule instead of
  silently resolving to an unrestricted empty rule.

Prompt assembly contract:

- `nion.agents.lead_agent.prompt.apply_prompt_template()` is the prompt assembly entrypoint.
- Keep `SYSTEM_PROMPT_TEMPLATE` as the core static prompt body, but assemble prompt sections through prompt section providers under `packages/harness/nion/prompt_sections/`.
- `apply_prompt_template()` should build `PromptBuildContext`, resolve an `AgentPromptProfile`, ask the prompt section registry for sections, then call `build_prompt_artifact()`.
- `threads/service.py` may pass session/runtime guidance through context, but must not reintroduce direct prompt text concatenation.

Delegated custom-agent orchestration contract:

- Main thread replies remain single-speaker: only the main agent speaks to the user.
- Mentioned/delegated custom agents run as temporary child runs under the parent thread.
- Child runs must not be stored or searched as formal `ThreadRecord` entries.
- Delegated custom-agent runtime uses the dedicated `delegated` surface: config-driven tool groups may be narrowed by caller permissions, builtin tools must not inherit workspace control-plane/mutation lanes, and MCP stays disabled by default.
- Delegated turns now produce `child_work_products` and replay them through the lead agent for final synthesis; the common finishing path still owns persistence, CLI management state, project projection, and background title generation.
- Local custom-agent orchestration should prefer LangGraph state/subgraph/checkpointer primitives.
- ACP and A2A are both runnable remote transports in this repository. A2A support now includes agent-card discovery, `message/send`, `message/stream`, thread-scoped remote session continuity, and terminal-state text preference over longer partial chunks.

Bridge configuration direction:
- Bridge credentials, enabled flags, verification state, and defaults are moving into Config Center / `config.db`
- Bridge runtime state (bindings, offsets, incidents, observations, weixin account session data) remains desktop-local for now
- Product framing rule: `/workspace/bridge` is no longer just “bridge bot settings”.
  It is the unified remote-entry management surface for the same guardian-mode
  computer, so page-level copy should describe shared computer/task/confirmation
  semantics while leaving platform-specific sections intact.
- `/workspace/bridge` overview now consumes `BridgeClient.getRuntimeInfo()` as its
  primary runtime source. Do not regress to stitching overview state from
  multiple independent calls (`getStatus`, `listBindings`, `listIncidents`) in
  the page layer.
- Overview-level diagnose/restart affordances belong in `BridgeOverviewPanel`;
  do not spread those buttons into per-platform sections unless the accepted
  slice boundary changes.
- `useGuardianRuntime()` is the frontend owner for mount/focus/visibility/manual
  refresh semantics. Do not reintroduce page-local `focus` or `visibilitychange`
  listeners once a surface has migrated to that hook.

If a gateway route is added and the Electron renderer consumes it, update
`app/daemon/app.py` too or the desktop shell will return 404 while the web/gateway
path keeps working.

Automation console contract rules:

- Keep `isolated_thread_id` on automation runs end-to-end so the frontend automation console can preview the execution thread for each run.
- Do not invent a parallel automation run-detail subsystem in the UI stack; prefer reusing existing thread state and thread routes for run preview surfaces.

When Electron reports `Timed out waiting for daemon health`, treat it as a daemon
startup regression first, not an Electron-only issue. Validate with:

- `cd backend && uv run python -m app.daemon.main`
- `make desktop-dev`

This catches truncated service modules, broken runtime factory exports, and
middleware import regressions before they are misdiagnosed as shell timing issues.

### Notebook Boundaries

Notebook is a user-owned knowledge and work-material library.

Current Notebook lane includes:

- note / directory / trash / history CRUD
- inbox-first default organization
- explicit chat-to-note save flow
- explicit workspace artifact copy archive flow
- notebook assistant note-scoped rewrite / summarize flow

Important boundary:

- Notebook is not memory
- Notebook is not project management
- Notebook must not auto-ingest workspace artifacts
- Notebook assistant stays note-scoped and content-focused
