# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nion is a LangGraph-based AI super agent system with a full-stack architecture. The backend provides a "super agent" with sandbox execution, persistent memory, subagent delegation, and extensible tool integration - all operating in per-thread isolated environments.

**Architecture**:
- **LangGraph Server** (port 2024): Agent runtime and workflow execution
- **Gateway API** (port 8001): REST API for models, MCP, skills, memory, artifacts, and uploads
- **Frontend** (port 3000): Next.js web interface
- **Nginx** (port 2026): Unified reverse proxy entry point
- **Provisioner** (port 8002, optional in Docker dev): Started only when sandbox is configured for provisioner/Kubernetes mode

**Project Structure**:
```
nion/
├── Makefile                    # Root commands (check, install, dev, stop)
├── config.yaml                 # Main application configuration
├── extensions_config.json      # MCP servers and skills configuration
├── backend/                    # Backend application (this directory)
│   ├── Makefile               # Backend-only commands (dev, gateway, lint)
│   ├── langgraph.json         # LangGraph server configuration
│   ├── packages/
│   │   └── harness/           # nion-harness package (import: nion.*)
│   │       ├── pyproject.toml
│   │       └── nion/
│   │           ├── agents/            # LangGraph agent system
│   │           │   ├── lead_agent/    # Main agent (factory + system prompt)
│   │           │   ├── middlewares/   # 10 middleware components
│   │           │   ├── memory/        # Memory extraction, queue, prompts
│   │           │   └── thread_state.py # ThreadState schema
│   │           ├── sandbox/           # Sandbox execution system
│   │           │   ├── local/         # Local filesystem provider
│   │           │   ├── sandbox.py     # Abstract Sandbox interface
│   │           │   ├── tools.py       # bash, ls, read/write/str_replace
│   │           │   └── middleware.py  # Sandbox lifecycle management
│   │           ├── subagents/         # Subagent delegation system
│   │           │   ├── builtins/      # general-purpose, bash agents
│   │           │   ├── executor.py    # Background execution engine
│   │           │   └── registry.py    # Agent registry
│   │           ├── tools/builtins/    # Built-in tools (present_files, ask_clarification, view_image)
│   │           ├── mcp/               # MCP integration (tools, cache, client)
│   │           ├── models/            # Model factory with thinking/vision support
│   │           ├── skills/            # Skills discovery, loading, parsing
│   │           ├── config/            # Configuration system (app, model, sandbox, tool, etc.)
│   │           ├── community/         # Community tools (tavily, jina_ai, firecrawl, image_search, aio_sandbox)
│   │           ├── reflection/        # Dynamic module loading (resolve_variable, resolve_class)
│   │           ├── utils/             # Utilities (network, readability)
│   │           └── client.py          # Embedded Python client (NionClient)
│   ├── app/                   # Application layer (import: app.*)
│   │   ├── gateway/           # FastAPI Gateway API
│   │   │   ├── app.py         # FastAPI application
│   │   │   └── routers/       # 6 route modules
│   │   └── channels/          # IM platform integrations
│   ├── tests/                 # Test suite
│   └── docs/                  # Documentation
├── frontend/                   # Next.js frontend application
└── skills/                     # Agent skills directory
    ├── public/                # Public skills (committed)
    └── custom/                # Custom skills (gitignored)
```

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
make check      # Check system requirements
make install    # Install all dependencies (frontend + backend)
make dev        # Start all services (LangGraph + Gateway + Frontend + Nginx), with config.yaml preflight
make stop       # Stop all services
```

**Backend directory** (for backend development only):
```bash
make install    # Install backend dependencies
make dev        # Run LangGraph server only (port 2024)
make gateway    # Run Gateway API only (port 8001)
make test       # Run all backend tests
make lint       # Lint with ruff
make format     # Format code with ruff
```

Regression tests related to Docker/provisioner behavior:
- `tests/test_docker_sandbox_mode_detection.py` (mode detection from `config.yaml`)
- `tests/test_provisioner_kubeconfig.py` (kubeconfig file/directory handling)

Boundary check (harness → app import firewall):
- `tests/test_harness_boundary.py` — ensures `packages/harness/nion/` never imports from `app.*`

CI runs these regression tests for every pull request via [.github/workflows/backend-unit-tests.yml](../.github/workflows/backend-unit-tests.yml).

## Architecture

### Harness / App Split

The backend is split into two layers with a strict dependency direction:

- **Harness** (`packages/harness/nion/`): Publishable agent framework package (`nion-harness`). Import prefix: `nion.*`. Contains agent orchestration, tools, sandbox, models, MCP, skills, config — everything needed to build and run agents.
- **App** (`app/`): Unpublished application code. Import prefix: `app.*`. Contains the FastAPI Gateway API and runtime integration surfaces.

**Dependency rule**: App imports nion, but nion never imports app. This boundary is enforced by `tests/test_harness_boundary.py` which runs in CI.

**Import conventions**:
```python
# Harness internal
from nion.agents import make_lead_agent
from nion.models import create_chat_model

# App internal
from app.gateway.app import app

# App → Harness (allowed)
from nion.config import get_app_config

# Harness → App (FORBIDDEN — enforced by test_harness_boundary.py)
# from app.gateway.routers.uploads import ...  # ← will fail CI
```

### Agent System

**Lead Agent** (`packages/harness/nion/agents/lead_agent/agent.py`):
- Entry point: `make_lead_agent(config: RunnableConfig)` registered in `langgraph.json`
- Dynamic model selection via `create_chat_model()` with thinking/vision support
- Tools loaded via `get_available_tools()` - combines sandbox, built-in, MCP, community, and subagent tools
- System prompt generated by `apply_prompt_template()` with skills, memory, and subagent instructions

**ThreadState** (`packages/harness/nion/agents/thread_state.py`):
- Extends `AgentState` with: `sandbox`, `thread_data`, `title`, `artifacts`, `todos`, `uploaded_files`, `viewed_images`
- Uses custom reducers: `merge_artifacts` (deduplicate), `merge_viewed_images` (merge/clear)

**Runtime Configuration** (via `config.configurable`):
- `thinking_enabled` - Enable model's extended thinking
- `model_name` - Select specific LLM model
- `is_plan_mode` - Enable TodoList middleware
- `subagent_enabled` - Enable task delegation tool

### Middleware Chain

Middlewares execute in strict order in `packages/harness/nion/agents/lead_agent/agent.py`:

1. **ThreadDataMiddleware** - Creates per-thread directories (`backend/.nion/threads/{thread_id}/user-data/{workspace,uploads,outputs}`)
2. **UploadsMiddleware** - Tracks and injects newly uploaded files into conversation
3. **SandboxMiddleware** - Acquires sandbox, stores `sandbox_id` in state
4. **DanglingToolCallMiddleware** - Injects placeholder ToolMessages for AIMessage tool_calls that lack responses (e.g., due to user interruption)
5. **GuardrailMiddleware** - Pre-tool-call authorization via pluggable `GuardrailProvider` protocol (optional, if `guardrails.enabled` in config). Evaluates each tool call and returns error ToolMessage on deny. Three provider options: built-in `AllowlistProvider` (zero deps), OAP policy providers (e.g. `aport-agent-guardrails`), or custom providers. See [docs/GUARDRAILS.md](docs/GUARDRAILS.md) for setup, usage, and how to implement a provider.
6. **SummarizationMiddleware** - Context reduction when approaching token limits (optional, if enabled)
7. **TodoListMiddleware** - Task tracking with `write_todos` tool (optional, if plan_mode)
8. **TitleMiddleware** - Auto-generates thread title after first complete exchange and normalizes structured message content before prompting the title model
9. **MemoryMiddleware** - Queues conversations for async memory update (filters to user + final AI responses)
10. **ViewImageMiddleware** - Injects base64 image data before LLM call (conditional on vision support)
11. **SubagentLimitMiddleware** - Truncates excess `task` tool calls from model response to enforce `MAX_CONCURRENT_SUBAGENTS` limit (optional, if subagent_enabled)
12. **ClarificationMiddleware** - Intercepts `ask_clarification` tool calls, interrupts via `Command(goto=END)` (must be last)

### Configuration System

**Main Configuration** (Config Center / SQLite-first):

Runtime configuration is now loaded from the Config Center SQLite store by default. The store lives at `config.db` under the resolved app data root and is versioned for optimistic writes.

Paths / runtime semantics now distinguish:
- app workspace root: `~/.nion-data/workspace`
- thread sandbox workdir: `~/.nion-data/threads/{thread_id}/user-data/workdir`
- optional thread host directory binding through `runtime_profile.json`

Config DB priority:
1. `NION_CONFIG_DB_PATH`
2. `NION_HOME` + `config.db`
3. `get_paths().base_dir / config.db`

`get_app_config()` now reads the SQLite store, records runtime load status per process, and can boot with minimal defaults even when no local `config.yaml` exists.

Config Center-owned surfaces now include:
- `acp_agents` for external ACP-compatible adapters such as Codex and Claude Code
- `memory.storage_class` for memory persistence provider selection

Contributor rule:
- Prefer `/api/config` plus the frontend settings pages for ACP and memory-provider changes
- Do not reintroduce handwritten `config.yaml` edits as the primary runtime path for those features

**Legacy YAML compatibility**:
- `AppConfig.from_file()` still exists as an explicit legacy escape hatch
- `config.example.yaml` and `make config-upgrade` remain available for old environments
- new settings writes must go through `/api/config` and the frontend Config Center

Config values starting with `$` are resolved as environment variables (e.g., `$OPENAI_API_KEY`).
`ModelConfig` also declares `use_responses_api` and `output_version` so OpenAI `/v1/responses` can be enabled explicitly while still using `langchain_openai:ChatOpenAI`.

**Extensions Configuration** (`extensions_config.json`):

MCP servers and skills are configured together in `extensions_config.json` in project root:

Configuration priority:
1. Explicit `config_path` argument
2. `NION_EXTENSIONS_CONFIG_PATH` environment variable
3. `extensions_config.json` in current directory (backend/)
4. `extensions_config.json` in parent directory (project root - **recommended location**)

### Gateway API (`app/gateway/`)

FastAPI application on port 8001 with health check at `GET /health`.

**Routers**:

| Router | Endpoints |
|--------|-----------|
| **Config** (`/api/config`) | `GET /` - read config; `GET /schema` - section metadata; `POST /validate` - validate payload; `PUT /` - update config; `GET /runtime-status` - runtime/store status |
| **Runtime Profile** (`/api/threads/{id}/runtime-profile`) | thread-scoped `sandbox` / `host` execution mode and optional host workdir binding |
| **Files** (`/api/threads/{id}/files`) | workdir root metadata and tree listing for the current thread |
| **CLI** (`/api/cli/catalog`) | runtime-visible CLI catalog for composer/runtime surfaces |
| **Model Admin** (`/api/model-admin`) | `GET /templates`; `GET /providers`; `POST/PATCH/DELETE /providers/*`; `POST /providers/{id}/test`; `POST /providers/{id}/discover-models`; `POST /providers/{id}/models`; `PATCH/DELETE /models/{id}`; `POST /models/{id}/test`; `GET /bindings`; `PUT /bindings/{binding_key}` |
| **Models** (`/api/models`) | Runtime-catalog compatibility surface backed by the model registry: `GET /` - list runtime models; `GET /{name}` - model details. Probe helpers remain at `POST /test-connection`, `POST /provider-models`, and `POST /model-metadata`. |
| **MCP** (`/api/mcp`) | `GET /config` - get config; `PUT /config` - update config (saves to extensions_config.json) |
| **Skills** (`/api/skills`) | `GET /` - list skills; `GET /{name}` - details; `PUT /{name}` - update enabled; `POST /install` - install from .skill archive (accepts standard optional frontmatter like `version`, `author`, `compatibility`) |
| **Memory** (`/api/memory`) | `GET /` - memory data; `POST /reload` - force reload; `DELETE /` - clear all memory; `DELETE /facts/{fact_id}` - delete a fact; `GET /config` - config; `GET /status` - config + data |
| **Notebook** (`/api/notebook`) | `GET /tree`; `GET /notes`; `GET /notes/{note_id}`; `POST /notes`; `PUT /notes/{note_id}`; `POST /notes/{note_id}/rename`; `POST /notes/{note_id}/move`; `PATCH /notes/{note_id}/metadata`; `GET /notes/{note_id}/history`; `GET /notes/{note_id}/history/{version_id}`; `POST /notes/{note_id}/restore`; `GET /notes/{note_id}/delete-preview`; `POST /notes/{note_id}/delete`; `POST /notes/{note_id}/restore-deleted`; `GET /trash`; `POST /directories`; `POST /directories/rename`; `POST /directories/delete`; `POST /notes/{note_id}/assist-preview`; `POST /notes/{note_id}/assist-apply`; `POST /notes/{note_id}/import` |
| **Projects** (`/api/projects`) | `GET /` - list projects; `POST /` - create project; `GET /{project_id}` - dashboard; `PATCH /{project_id}` - update basics; `POST /{project_id}/complete`; `GET/POST /{project_id}/plans*`; `GET/POST /{project_id}/threads*`; `GET /{project_id}/timeline*`; `GET/POST /{project_id}/artifacts*`; `GET/POST /{project_id}/memory*`; `GET/POST /{project_id}/decisions*` |
| **Uploads** (`/api/threads/{id}/uploads`) | `POST /` - upload files (auto-converts PDF/PPT/Excel/Word); `GET /list` - list; `DELETE /{filename}` - delete |
| **Artifacts** (`/api/threads/{id}/artifacts`) | `GET /{path}` - serve artifacts; `?download=true` for file download |
| **Suggestions** (`/api/threads/{id}/suggestions`) | `POST /` - generate follow-up questions; rich list/block model content is normalized before JSON parsing |

Proxied through nginx: `/api/langgraph/*` → LangGraph, all other `/api/*` → Gateway.

### Local Daemon Surface

The desktop local daemon reuses the gateway router modules directly. Keep its
route surface aligned with the renderer expectations, including:

- `/api/model-admin/*`
- `/api/threads/{thread_id}/runtime-profile`
- `/api/models`, `/api/config`, `/api/skills`, `/api/files`, `/api/cli/catalog`
- `/api/projects`
- `/api/daemon/logs`, `/api/daemon/logs/tail`
- `/api/daemon/diagnostics`, `/api/daemon/diagnostics/threads/{thread_id}`, `/api/daemon/diagnostics/skills/{skill_name}`
- `/api/daemon/diagnostics/tasks/{task_id}`
- `/api/daemon/channels/*`

If a gateway route is added and the Electron renderer consumes it, update
`app/daemon/app.py` too or the desktop shell will return 404 while the web/gateway
path keeps working.

Program 03 adds a daemon control plane backed by `telemetry.sqlite3` under the
resolved Nion app data root. Keep telemetry human-readable in `message`,
machine-readable in structured `details`, and prefer querying through daemon APIs
or built-in control-plane tools instead of direct database scraping.

Program 03B extends that contract to delegated execution:

- use `run_id` as the delegated task correlation key
- keep task-tool and subagent-executor events bounded to counts, IDs, durations, and short summaries
- prefer task diagnostics over reconstructing delegated failures from raw event tails

Program 03C extends the daemon control plane to channels:

- daemon lifespan owns `ChannelService` startup and shutdown in desktop mode
- `/api/daemon/channels/*` is the authoritative surface for channel runtime inspection and bounded actions
- `/api/channels/*` remains for compatibility and operator UI
- channel telemetry must cover service lifecycle events, message-bus events, channel diagnostics, and bounded runtime control actions
- do not expand daemon channel routes into config, credential, or session-override mutation without a separate design and plan

Program 03D-A extends the daemon control plane to incident workflow:

- incident records are persisted in the same SQLite-backed control plane as diagnosis artifacts
- `POST /api/daemon/incidents/diagnose` is the chat-first incident entrypoint
- implemented incident playbooks are limited to non-bridge `agent_execution` failures:
  - `task_timeout`
  - `subagent_failure`
  - `tool_execution_failure`
  - `thread_stream_failure`
- suggested actions are suggestion-first and require confirmation before execution
- `daemon_runtime` playbooks are designed into the contract but are not implemented yet
- bridge/channel incidents are intentionally excluded from this phase
- a desktop diagnostics center is a future consumer of incident records rather than a second diagnosis engine

### Projects Module

The Project module is a top-level workspace surface for long-running work containers.

Current v1 lane includes:

- top-level workspace route family under `/workspace/projects`
- independent project chat routes under `/workspace/projects/{project_id}/threads/{thread_id}`
- gateway-owned SQLite metadata store at `{NION_HOME}/projects.sqlite3`
- project dashboard, execution plans, project threads, timeline, decisions, managed artifacts, and project memory summaries
- project thread context propagation through `context.project_id`, `context.project_phase`, and `context.primary_plan_id`

Important boundary:

- Project is not a Notebook replacement and must not auto-write Notebook
- Project threads are still normal thread runtime flows; `/api/projects/*` owns project state, not `/api/threads/*`

### Sandbox System (`packages/harness/nion/sandbox/`)

**Interface**: Abstract `Sandbox` with `execute_command`, `read_file`, `write_file`, `list_dir`
**Provider Pattern**: `SandboxProvider` with `acquire`, `get`, `release` lifecycle
**Implementations**:
- `LocalSandboxProvider` - Singleton local filesystem execution with path mappings
- `AioSandboxProvider` (`packages/harness/nion/community/`) - Docker-based isolation

**Virtual Path System**:
- Agent sees: `/mnt/user-data/{workspace,uploads,outputs}`, `/mnt/skills`
- Physical: `backend/.nion/threads/{thread_id}/user-data/...`, `nion/skills/`
- Translation: `replace_virtual_path()` / `replace_virtual_paths_in_command()`
- Detection: `is_local_sandbox()` checks `sandbox_id == "local"`

**Sandbox Tools** (in `packages/harness/nion/sandbox/tools.py`):
- `bash` - Execute commands with path translation and error handling
- `ls` - Directory listing (tree format, max 2 levels)
- `read_file` - Read file contents with optional line range
- `write_file` - Write/append to files, creates directories
- `str_replace` - Substring replacement (single or all occurrences)

### Subagent System (`packages/harness/nion/subagents/`)

**Built-in Agents**: `general-purpose` (all tools except `task`) and `bash` (command specialist)
**Execution**: Dual thread pool - `_scheduler_pool` (3 workers) + `_execution_pool` (3 workers)
**Concurrency**: `MAX_CONCURRENT_SUBAGENTS = 3` enforced by `SubagentLimitMiddleware` (truncates excess tool calls in `after_model`), 15-minute timeout
**Flow**: `task()` tool → `SubagentExecutor` → background thread → poll 5s → SSE events → result
**Events**: `task_started`, `task_running`, `task_completed`/`task_failed`/`task_timed_out`

### Tool System (`packages/harness/nion/tools/`)

`get_available_tools(groups, include_mcp, model_name, subagent_enabled)` assembles:
1. **Config-defined tools** - Resolved from `config.yaml` via `resolve_variable()`
2. **MCP tools** - From enabled MCP servers (lazy initialized, cached with mtime invalidation)
3. **Built-in tools**:
   - `present_files` - Make output files visible to user (only `/mnt/user-data/outputs`)
   - `ask_clarification` - Request clarification (intercepted by ClarificationMiddleware → interrupts)
   - `view_image` - Read image as base64 (added only if model supports vision)
4. **Subagent tool** (if enabled):
   - `task` - Delegate to subagent (description, prompt, subagent_type, max_turns)

**Community tools** (`packages/harness/nion/community/`):
- `tavily/` - Web search (5 results default) and web fetch (4KB limit)
- `jina_ai/` - Web fetch via Jina reader API with readability extraction
- `firecrawl/` - Web scraping via Firecrawl API
- `image_search/` - Image search via DuckDuckGo

### MCP System (`packages/harness/nion/mcp/`)

- Uses `langchain-mcp-adapters` `MultiServerMCPClient` for multi-server management
- **Lazy initialization**: Tools loaded on first use via `get_cached_mcp_tools()`
- **Cache invalidation**: Detects config file changes via mtime comparison
- **Transports**: stdio (command-based), SSE, HTTP
- **OAuth (HTTP/SSE)**: Supports token endpoint flows (`client_credentials`, `refresh_token`) with automatic token refresh + Authorization header injection
- **Runtime updates**: Gateway API saves to extensions_config.json; LangGraph detects via mtime

### Skills System (`packages/harness/nion/skills/`)

- **Location**: `nion/skills/{public,custom}/`
- **Format**: Directory with `SKILL.md` (YAML frontmatter: name, description, license, allowed-tools)
- **Loading**: `load_skills()` recursively scans `skills/{public,custom}` for `SKILL.md`, parses metadata, and reads enabled state from extensions_config.json
- **Injection**: Enabled skills listed in agent system prompt with container paths
- **Installation**: `POST /api/skills/install` extracts .skill ZIP archive to custom/ directory

### Model Factory (`packages/harness/nion/models/factory.py`)

- `create_chat_model(name, thinking_enabled)` instantiates LLM from config via reflection
- Supports `thinking_enabled` flag with per-model `when_thinking_enabled` overrides
- Supports `supports_vision` for image understanding models, but capability metadata such as `supports_video` stays out of runtime constructor kwargs
- Config values starting with `$` resolved as environment variables
- Missing provider modules surface actionable install hints from reflection resolvers (for example `uv add langchain-google-genai`)

### IM Channels System (`app/channels/`)

Legacy IM channel runtime references below describe a removed subsystem. This branch is migrating to a desktop-first Bridge replacement instead.

**Architecture**: Channels communicate with the LangGraph Server through `langgraph-sdk` HTTP client (same as the frontend), ensuring threads are created and managed server-side.

**Components**:
- `message_bus.py` - Async pub/sub hub (`InboundMessage` → queue → dispatcher; `OutboundMessage` → callbacks → channels)
- `store.py` - JSON-file persistence mapping `channel_name:chat_id[:topic_id]` → `thread_id` (keys are `channel:chat` for root conversations and `channel:chat:topic` for threaded conversations)
- `pairing_repository.py` / `pairing_service.py` - JSON persistence and service-layer policy for per-user-per-chat authorization and pending approval counts
- `manager.py` - Core dispatcher: creates threads via `client.threads.create()`, routes commands, keeps Slack/Telegram on `client.runs.wait()`, and uses `client.runs.stream(["messages-tuple", "values"])` for Feishu incremental outbound updates
- `runtime_state.py` - Observational runtime metadata (`capabilities`, `last_heartbeat`, `last_error`) used for operator-facing status without owning config or routing state
- `base.py` - Abstract `Channel` base class (start/stop/send lifecycle)
- Historical channel runtime files in this section have been removed from the active codebase.

**Message Flow**:
1. External platform -> Channel impl -> `MessageBus.publish_inbound()`
2. `ChannelManager._dispatch_loop()` consumes from queue
3. For chat: look up/create thread on LangGraph Server
4. Feishu chat: `runs.stream()` → accumulate AI text → publish multiple outbound updates (`is_final=False`) → publish final outbound (`is_final=True`)
5. Slack/Telegram chat: `runs.wait()` → extract final response → publish outbound
6. Feishu channel sends one running reply card up front, then patches the same card for each outbound update (card JSON sets `config.update_multi=true` for Feishu's patch API requirement)
7. Before runtime entry, pairing policy is checked per `channel_name + chat_id + user_id`; only `/help` bypasses pairing
8. For commands (`/new`, `/status`, `/models`, `/memory`, `/help`): handle locally or query Gateway API when authorized
9. Outbound → channel callbacks → platform reply

**Operator status contract**:
- The old `/api/channels` contract has been removed from active code.
- A new Bridge contract is being introduced in the desktop shell.

### Memory System (`packages/harness/nion/agents/memory/`)

**Components**:
- `updater.py` - LLM-based memory updates with fact extraction, whitespace-normalized fact deduplication (trims leading/trailing whitespace before comparing), plus clear-all / fact-delete helpers built on the configured storage provider
- `queue.py` - Debounced update queue (per-thread deduplication, configurable wait time)
- `prompt.py` - Prompt templates for memory updates

**Data Structure** (stored in `backend/.nion/memory.json`):
- **User Context**: `workContext`, `personalContext`, `topOfMind` (1-3 sentence summaries)
- **History**: `recentMonths`, `earlierContext`, `longTermBackground`
- **Facts**: Discrete facts with `id`, `content`, `category` (preference/knowledge/context/behavior/goal), `confidence` (0-1), `createdAt`, `source`

**Workflow**:
1. `MemoryMiddleware` filters messages (user inputs + final AI responses) and queues conversation
2. Queue debounces (30s default), batches updates, deduplicates per-thread
3. Background thread invokes LLM to extract context updates and facts
4. Applies updates atomically (temp file + rename) with cache invalidation, skipping duplicate fact content before append
5. Next interaction injects top 15 facts + context into `<memory>` tags in system prompt

Focused regression coverage for the updater lives in `backend/tests/test_memory_updater.py`.

**Configuration** (`config.yaml` → `memory`):
- `enabled` / `injection_enabled` - Master switches
- `storage_path` - Path to memory.json
- `debounce_seconds` - Wait time before processing (default: 30)
- `model_name` - LLM for updates (null = default model)
- `max_facts` / `fact_confidence_threshold` - Fact storage limits (100 / 0.7)
- `max_injection_tokens` - Token limit for prompt injection (2000)

### Reflection System (`packages/harness/nion/reflection/`)

- `resolve_variable(path)` - Import module and return variable (e.g., `module.path:variable_name`)
- `resolve_class(path, base_class)` - Import and validate class against base class

### Config Schema

**`config.yaml`** key sections:
- `models[]` - LLM configs with `use` class path, `supports_thinking`, `supports_vision`, provider-specific fields
- `tools[]` - Tool configs with `use` variable path and `group`
- `tool_groups[]` - Logical groupings for tools
- `sandbox.use` - Sandbox provider class path
- `skills.path` / `skills.container_path` - Host and container paths to skills directory
- `title` - Auto-title generation (enabled, max_words, max_chars, prompt_template)
- `summarization` - Context summarization (enabled, trigger conditions, keep policy)
- `subagents.enabled` - Master switch for subagent delegation
- `memory` - Memory system (enabled, storage_path, debounce_seconds, model_name, max_facts, fact_confidence_threshold, injection_enabled, max_injection_tokens)

**`extensions_config.json`**:
- `mcpServers` - Map of server name → config (enabled, type, command, args, env, url, headers, oauth, description)
- `skills` - Map of skill name → state (enabled)

Both can be modified at runtime via Gateway API endpoints or `NionClient` methods.

### Embedded Client (`packages/harness/nion/client.py`)

`NionClient` provides direct in-process access to all Nion capabilities without HTTP services. All return types align with the Gateway API response schemas, so consumer code works identically in HTTP and embedded modes.

**Architecture**: Imports the same `nion` modules that LangGraph Server and Gateway API use. Shares the same config files and data directories. No FastAPI dependency.

**Agent Conversation** (replaces LangGraph Server):
- `chat(message, thread_id)` — synchronous, returns final text
- `stream(message, thread_id)` — yields `StreamEvent` aligned with LangGraph SSE protocol:
  - `"values"` — full state snapshot (title, messages, artifacts)
  - `"messages-tuple"` — per-message update (AI text, tool calls, tool results)
  - `"end"` — stream finished
- Agent created lazily via `create_agent()` + `_build_middlewares()`, same as `make_lead_agent`
- Supports `checkpointer` parameter for state persistence across turns
- `reset_agent()` forces agent recreation (e.g. after memory or skill changes)

**Gateway Equivalent Methods** (replaces Gateway API):

| Category | Methods | Return format |
|----------|---------|---------------|
| Models | `list_models()`, `get_model(name)` | `{"models": [...]}`, `{name, display_name, ...}` |
| MCP | `get_mcp_config()`, `update_mcp_config(servers)` | `{"mcp_servers": {...}}` |
| Skills | `list_skills()`, `get_skill(name)`, `update_skill(name, enabled)`, `install_skill(path)` | `{"skills": [...]}` |
| Memory | `get_memory()`, `reload_memory()`, `clear_memory()`, `delete_memory_fact(fact_id)`, `get_memory_config()`, `get_memory_status()` | dict |
| Uploads | `upload_files(thread_id, files)`, `list_uploads(thread_id)`, `delete_upload(thread_id, filename)` | `{"success": true, "files": [...]}`, `{"files": [...], "count": N}` |
| Artifacts | `get_artifact(thread_id, path)` → `(bytes, mime_type)` | tuple |

**Key difference from Gateway**: Upload accepts local `Path` objects instead of HTTP `UploadFile`, rejects directory paths before copying, and reuses a single worker when document conversion must run inside an active event loop. Artifact returns `(bytes, mime_type)` instead of HTTP Response. `update_mcp_config()` and `update_skill()` automatically invalidate the cached agent.

**Tests**: `tests/test_client.py` (77 unit tests including `TestGatewayConformance`), `tests/test_client_live.py` (live integration tests, requires config.yaml)

**Gateway Conformance Tests** (`TestGatewayConformance`): Validate that every dict-returning client method conforms to the corresponding Gateway Pydantic response model. Each test parses the client output through the Gateway model — if Gateway adds a required field that the client doesn't provide, Pydantic raises `ValidationError` and CI catches the drift. Covers: `ModelsListResponse`, `ModelResponse`, `SkillsListResponse`, `SkillResponse`, `SkillInstallResponse`, `McpConfigResponse`, `UploadResponse`, `MemoryConfigResponse`, `MemoryStatusResponse`.

## Development Workflow

### Test-Driven Development (TDD) — MANDATORY

**Every new feature or bug fix MUST be accompanied by unit tests. No exceptions.**

- Write tests in `backend/tests/` following the existing naming convention `test_<feature>.py`
- Run the full suite before and after your change: `make test`
- Tests must pass before a feature is considered complete
- For lightweight config/utility modules, prefer pure unit tests with no external dependencies
- If a module causes circular import issues in tests, add a `sys.modules` mock in `tests/conftest.py` (see existing example for `nion.subagents.executor`)

```bash
# Run all tests
make test

# Run a specific test file
PYTHONPATH=. uv run pytest tests/test_<feature>.py -v
```

### Running the Full Application

From the **project root** directory:
```bash
make dev
```

This starts all services and makes the application available at `http://localhost:2026`.

**Nginx routing**:
- `/api/langgraph/*` → LangGraph Server (2024)
- `/api/*` (other) → Gateway API (8001)
- `/` (non-API) → Frontend (3000)

### Running Backend Services Separately

From the **backend** directory:

```bash
# Terminal 1: LangGraph server
make dev

# Terminal 2: Gateway API
make gateway
```

Direct access (without nginx):
- LangGraph: `http://localhost:2024`
- Gateway: `http://localhost:8001`

### Frontend Configuration

The frontend uses environment variables to connect to backend services:
- `NEXT_PUBLIC_LANGGRAPH_BASE_URL` - Defaults to `/api/langgraph` (through nginx)
- `NEXT_PUBLIC_BACKEND_BASE_URL` - Defaults to empty string (through nginx)

Desktop branch note:
- The Electron renderer runs on the privileged `nion://app` origin and talks directly to the bundled helper.
- Gateway therefore installs FastAPI CORS middleware for `nion://app` in addition to web origins; do not remove it unless desktop traffic is re-proxied through an HTTP origin again.

When using `make dev` from root, the frontend automatically connects through nginx.

## Key Features

### File Upload

Multi-file upload with automatic document conversion:
- Endpoint: `POST /api/threads/{thread_id}/uploads`
- Supports: PDF, PPT, Excel, Word documents (converted via `markitdown`)
- Rejects directory inputs before copying so uploads stay all-or-nothing
- Reuses one conversion worker per request when called from an active event loop
- Files stored in thread-isolated directories
- Agent receives uploaded file list via `UploadsMiddleware`

See [docs/FILE_UPLOAD.md](docs/FILE_UPLOAD.md) for details.

### Plan Mode

TodoList middleware for complex multi-step tasks:
- Controlled via runtime config: `config.configurable.is_plan_mode = True`
- Provides `write_todos` tool for task tracking
- One task in_progress at a time, real-time updates

See [docs/plan_mode_usage.md](docs/plan_mode_usage.md) for details.

### Context Summarization

Automatic conversation summarization when approaching token limits:
- Configured in `config.yaml` under `summarization` key
- Trigger types: tokens, messages, or fraction of max input
- Keeps recent messages while summarizing older ones

See [docs/summarization.md](docs/summarization.md) for details.

### Vision Support

For models with `supports_vision: true`:
- `ViewImageMiddleware` processes images in conversation
- `view_image_tool` added to agent's toolset
- Images automatically converted to base64 and injected into state

## Code Style

- Uses `ruff` for linting and formatting
- Line length: 240 characters
- Python 3.12+ with type hints
- Double quotes, space indentation

## Documentation

See `docs/` directory for detailed documentation:
- [CONFIGURATION.md](docs/CONFIGURATION.md) - Configuration options
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Architecture details
- [API.md](docs/API.md) - API reference
- [SETUP.md](docs/SETUP.md) - Setup guide
- [FILE_UPLOAD.md](docs/FILE_UPLOAD.md) - File upload feature
- [PATH_EXAMPLES.md](docs/PATH_EXAMPLES.md) - Path types and usage
- [summarization.md](docs/summarization.md) - Context summarization
- [plan_mode_usage.md](docs/plan_mode_usage.md) - Plan mode with TodoList
