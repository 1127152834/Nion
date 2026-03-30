# Nion Runtime Backend

Nion ships with one shared backend capability layer and two first-party shells:

- Web: deployed HTTP services + browser client
- Desktop: bundled local daemon + Electron client

This document focuses on the local-daemon wrapper, which is the desktop-hosted runtime surface bundled into the Electron application. In Program 01, Electron became a single-window client of this daemon rather than the owner of a helper child process. The daemon also exposes a thin CLI management surface for status and stop operations, which can support future diagnostics and self-operations work.

The next layer is the daemon control plane:

- structured event logging in SQLite
- daemon and thread diagnostics
- delegated task and subagent execution diagnostics
- agent-facing self-inspection tools
- guarded self-operation tools for approved surfaces

This control plane is designed for both humans and agents. Event messages should remain readable while preserving machine-parseable detail payloads.

Token-source usage accounting is part of that telemetry layer. Non-streaming model calls can use a normal context manager, but streaming `stream()` / `astream()` loops must reapply token-source scope per yielded chunk so cross-context generator resumes do not crash telemetry cleanup.

Program 03B extends that surface with delegated execution observability:

- `run_id` is the correlation key for delegated task execution
- daemon logs can be filtered by `run_id`
- daemon diagnostics now include task-level summaries
- built-in control-plane tools can fetch task diagnostics for self-inspection

Program 03C extends that same daemon-owned surface to channels:

- the desktop daemon now owns `ChannelService` lifecycle as well as runtime diagnostics
- `/api/daemon/channels/*` is the authoritative channel control-plane surface
- `/api/channels/*` remains a compatibility and UI surface
- channel telemetry now includes service lifecycle events, message-bus events, and channel diagnostics snapshots
- bounded runtime actions now include restart, pairing code issuance, pair-request approve/reject, and authorized-user revoke
- config, credentials, and session override mutation remain outside the daemon channel control plane

Program 03D-A extends that surface to incident workflow:

- `incident_records` now persist structured diagnosis results above raw events and snapshots
- the first implementation path is `chat-triggered diagnosis`, not background auto-repair
- currently implemented incident types are `task_timeout`, `subagent_failure`, `tool_execution_failure`, and `thread_stream_failure`
- suggested actions remain bounded and require confirmation before execution
- a desktop diagnostics center is designed to consume incident records later, but it is not implemented in this phase
- bridge/channel incidents, `daemon_runtime` playbooks, and auto-remediation remain out of scope for 03D-A

Program 03E extends the same local-daemon surface to AutoDream:

- AutoDream remains an embedded OpenViking capability, not an external service
- manual runs stay available at `POST /api/autodream/run`
- the daemon now owns a background scheduler loop for AutoDream
- eligibility stays on the `24h + 5 completed sessions` rule
- idle gating is based on active thread-stream work, not desktop process presence
- scheduler state is exposed at `GET /api/autodream/status`

Program 04 begins the Memory OS transition:

- a new provider foundation now exists under `/api/memory-os/*`
- provider families currently include `builtin`, `mem0`, and `openviking`
- OpenViking provider metadata now distinguishes `embedded` and `remote` modes
- this milestone only introduces provider metadata and active binding state
- runtime hot paths still use the legacy memory path in this milestone

Program 04B starts the runtime migration off `memory.json`:

- `/api/memory` remains available, but now acts as a compatibility bridge over Memory OS
- prompt memory injection now resolves through Memory OS
- `MemoryMiddleware` now routes post-chat capture through the active provider
- the embedded Python client now routes memory reads/writes through Memory OS
- the active runtime provider for this milestone is still Built-in

Program 04C activates the OpenViking provider family:

- OpenViking is no longer just a provider metadata family; it now has a real provider implementation
- provider config supports both `embedded` and `remote` modes
- embedded mode uses the local OpenViking runtime already bundled into Nion
- remote mode uses a dedicated transport bridge for external OpenViking services
- embedded provider-facing reads now expose notebook resource listings and AutoDream journal listings
- embedded provider-facing writes now support minimal user-memory and agent-memory payload round-trips
- OpenViking runtime providers now satisfy the legacy memory runtime contract too: post-chat capture, clear-memory, and delete-fact all resolve through Memory OS without falling back to `memory.json`
- this milestone activates provider plumbing and mode/status exposure, but does not yet redesign the memory console

---

## Architecture

```
                        ┌──────────────────────────────────────┐
                        │          Nginx (Port 2026)           │
                        │      Unified reverse proxy           │
                        └───────┬──────────────────┬───────────┘
                                │                  │
              /api/langgraph/*  │                  │  /api/* (other)
                                ▼                  ▼
               ┌────────────────────┐  ┌────────────────────────┐
               │ LangGraph Server   │  │   Gateway API (8001)   │
               │    (Port 2024)     │  │   FastAPI REST         │
               │                    │  │                        │
               │ ┌────────────────┐ │  │ Models, MCP, Skills,   │
               │ │  Lead Agent    │ │  │ Memory, Uploads,       │
               │ │  ┌──────────┐  │ │  │ Artifacts              │
               │ │  │Middleware│  │ │  └────────────────────────┘
               │ │  │  Chain   │  │ │
               │ │  └──────────┘  │ │
               │ │  ┌──────────┐  │ │
               │ │  │  Tools   │  │ │
               │ │  └──────────┘  │ │
               │ │  ┌──────────┐  │ │
               │ │  │Subagents │  │ │
               │ │  └──────────┘  │ │
               │ └────────────────┘ │
               └────────────────────┘
```

**Request Routing** (via Nginx):
- `/api/langgraph/*` → LangGraph Server - agent interactions, threads, streaming
- `/api/*` (other) → Gateway API - models, MCP, skills, memory, artifacts, uploads
- `/` (non-API) → Frontend - Next.js web interface

---

## Core Components

### Lead Agent

The single LangGraph agent (`lead_agent`) is the runtime entry point, created via `make_lead_agent(config)`. It combines:

- **Dynamic model selection** with thinking and vision support
- **Middleware chain** for cross-cutting concerns (9 middlewares)
- **Tool system** with sandbox, MCP, community, and built-in tools
- **Subagent delegation** for parallel task execution
- **System prompt** with skills injection, memory context, and working directory guidance

### Middleware Chain

Middlewares execute in strict order, each handling a specific concern:

| # | Middleware | Purpose |
|---|-----------|---------|
| 1 | **ThreadDataMiddleware** | Creates per-thread isolated directories (workspace, uploads, outputs) |
| 2 | **UploadsMiddleware** | Injects newly uploaded files into conversation context |
| 3 | **SandboxMiddleware** | Acquires sandbox environment for code execution |
| 4 | **SummarizationMiddleware** | Reduces context when approaching token limits (optional) |
| 5 | **TodoListMiddleware** | Tracks multi-step tasks in plan mode (optional) |
| 6 | **TitleMiddleware** | Auto-generates conversation titles after first exchange |
| 7 | **MemoryMiddleware** | Queues conversations for async memory extraction |
| 8 | **ViewImageMiddleware** | Injects image data for vision-capable models (conditional) |
| 9 | **ClarificationMiddleware** | Intercepts clarification requests and interrupts execution (must be last) |

### Sandbox System

Per-thread isolated execution with virtual path translation:

- **Abstract interface**: `execute_command`, `read_file`, `write_file`, `list_dir`
- **Providers**: `LocalSandboxProvider` (filesystem) and `AioSandboxProvider` (Docker, in community/)
- **Virtual paths**: `/mnt/user-data/{workspace,uploads,outputs}` → thread-specific physical directories
- **Skills path**: `/mnt/skills` → `nion/skills/` directory
- **Skills loading**: Recursively discovers nested `SKILL.md` files under `skills/{public,custom}` and preserves nested container paths
- **Tools**: `bash`, `ls`, `read_file`, `write_file`, `str_replace`

### Subagent System

Async task delegation with concurrent execution:

- **Built-in agents**: `general-purpose` (full toolset) and `bash` (command specialist)
- **Concurrency**: Max 3 subagents per turn, 15-minute timeout
- **Execution**: Background thread pools with status tracking and SSE events
- **Flow**: Agent calls `task()` tool → executor runs subagent in background → polls for completion → returns result

### Memory System

LLM-powered persistent context retention across conversations:

- **Automatic extraction**: Analyzes conversations for user context, facts, and preferences
- **Structured storage**: User context (work, personal, top-of-mind), history, and confidence-scored facts
- **Debounced updates**: Batches updates to minimize LLM calls (configurable wait time)
- **System prompt injection**: Top facts + context injected into agent prompts
- **Storage**: JSON file with mtime-based cache invalidation

### Tool Ecosystem

| Category | Tools |
|----------|-------|
| **Sandbox** | `bash`, `ls`, `read_file`, `write_file`, `str_replace` |
| **Built-in** | `present_files`, `ask_clarification`, `view_image`, `task` (subagent) |
| **Community** | Tavily (web search), Jina AI (web fetch), Firecrawl (scraping), DuckDuckGo (image search) |
| **MCP** | Any Model Context Protocol server (stdio, SSE, HTTP transports) |
| **Skills** | Domain-specific workflows injected via system prompt |

### Gateway API

FastAPI application providing REST endpoints for frontend integration:

| Route | Purpose |
|-------|---------|
| `GET /api/config` | Read config-center state |
| `GET /api/config/schema` | Read config-center section schema |
| `POST /api/config/validate` | Validate config payload |
| `PUT /api/config` | Persist config with version conflict detection |
| `GET /api/config/runtime-status` | Inspect store/runtime version alignment |
| `GET/PUT /api/threads/{id}/runtime-profile` | Read/update thread runtime mode |
| `GET /api/threads/{id}/files/meta` | Inspect current thread workdir root |
| `GET /api/threads/{id}/files/tree` | Browse current thread workdir tree |
| `GET /api/cli/catalog` | Inspect runtime-visible CLI catalog |
| `GET /api/models` | List available LLM models |
| `GET/PUT /api/mcp/config` | Manage MCP server configurations |
| `GET/PUT /api/skills` | List and manage skills |
| `POST /api/skills/install` | Install skill from `.skill` archive |
| `GET /api/memory` | Retrieve memory data |
| `POST /api/memory/reload` | Force memory reload |
| `GET /api/memory/config` | Memory configuration |
| `GET /api/memory/status` | Combined config + data |
| `GET /api/memory-os/providers/families` | List Memory OS provider families and capabilities |
| `GET /api/memory-os/providers/state` | Read the active Memory OS binding state |
| `PUT /api/memory-os/providers/state` | Update the active Memory OS binding state |
| `POST /api/autodream/run` | Trigger an AutoDream run manually |
| `GET /api/autodream/status` | Inspect daemon-owned AutoDream scheduler state |
| `POST /api/threads/{id}/uploads` | Upload files (auto-converts PDF/PPT/Excel/Word to Markdown, rejects directory paths) |
| `GET /api/threads/{id}/uploads/list` | List uploaded files |
| `GET /api/threads/{id}/artifacts/{path}` | Serve generated artifacts |

Desktop daemon validation note:

- `make desktop-dev` depends on the local daemon booting successfully at `http://127.0.0.1:43115/health`
- if Electron reports a daemon health timeout, first run `cd backend && uv run python -m app.daemon.main` to expose the real import/startup error
- changes touching runtime service factories, lead-agent middleware wiring, or gateway router imports should be verified with both the daemon command above and `make desktop-dev`

### Bridge Transition

The legacy IM channel runtime has been removed from this branch. A new desktop-first Bridge subsystem is replacing it, with current work focused on desktop-backed bridge state, adapter lifecycles, settings, and external messaging integration.

Memory compatibility note:

- the legacy `memory.json` shape is still the built-in provider's compatibility payload in this milestone
- runtime code should not call the legacy updater/storage helpers directly anymore
- direct `memory.json` semantics are now considered internal implementation detail of the built-in provider bridge

---

## Quick Start

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager
- API keys for your chosen LLM provider

### Installation

```bash
cd nion

# Install backend dependencies
cd backend
make install
```

### Configuration

The backend can now boot without a local `config.yaml`. If you want a legacy YAML bootstrap path, you can still copy and edit one, but the preferred path is the Config Center API / settings UI backed by SQLite.

Two newer runtime surfaces follow that rule as well:

- **ACP agent integrations** are configured through Config Center and the frontend Agent Integrations page, not by hand-editing `acp_agents` in YAML during normal workflows.
- **Memory storage provider selection** is configured through Config Center and the frontend Memory page, which maps safe UI modes onto `memory.storage_class`.

Optional legacy example:

```yaml
models:
  - name: gpt-4o
    display_name: GPT-4o
    use: langchain_openai:ChatOpenAI
    model: gpt-4o
    api_key: $OPENAI_API_KEY
    supports_thinking: false
    supports_vision: true

  - name: gpt-5-responses
    display_name: GPT-5 (Responses API)
    use: langchain_openai:ChatOpenAI
    model: gpt-5
    api_key: $OPENAI_API_KEY
    use_responses_api: true
    output_version: responses/v1
    supports_vision: true
```

Set your API keys:

```bash
export OPENAI_API_KEY="your-api-key-here"
```

### Running

**Full Application** (from project root):

```bash
make dev  # Starts LangGraph + Gateway + Frontend + Nginx
```

Access at: http://localhost:2026

When no `config.yaml` exists, Nion boots with Config Center defaults and stores runtime config in SQLite instead of failing startup.

Runtime/workdir semantics:
- app workspace root: `~/.nion-data/workspace`
- thread sandbox workdir: `~/.nion-data/threads/{thread_id}/user-data/workdir`
- web `host` mode is valid and can be enabled without pre-binding a host directory

**Backend Only** (from backend directory):

```bash
# Terminal 1: LangGraph server
make dev

# Terminal 2: Gateway API
make gateway
```

Direct access: LangGraph at http://localhost:2024, Gateway at http://localhost:8001

---

## Project Structure

```
backend/
├── src/
│   ├── agents/                  # Agent system
│   │   ├── lead_agent/         # Main agent (factory, prompts)
│   │   ├── middlewares/        # 9 middleware components
│   │   ├── memory/             # Memory extraction & storage
│   │   └── thread_state.py    # ThreadState schema
│   ├── gateway/                # FastAPI Gateway API
│   │   ├── app.py             # Application setup
│   │   └── routers/           # 6 route modules
│   ├── sandbox/                # Sandbox execution
│   │   ├── local/             # Local filesystem provider
│   │   ├── sandbox.py         # Abstract interface
│   │   ├── tools.py           # bash, ls, read/write/str_replace
│   │   └── middleware.py      # Sandbox lifecycle
│   ├── subagents/              # Subagent delegation
│   │   ├── builtins/          # general-purpose, bash agents
│   │   ├── executor.py        # Background execution engine
│   │   └── registry.py        # Agent registry
│   ├── tools/builtins/         # Built-in tools
│   ├── mcp/                    # MCP protocol integration
│   ├── models/                 # Model factory
│   ├── skills/                 # Skill discovery & loading
│   ├── config/                 # Configuration system
│   ├── community/              # Community tools & providers
│   ├── reflection/             # Dynamic module loading
│   └── utils/                  # Utilities
├── docs/                       # Documentation
├── tests/                      # Test suite
├── langgraph.json              # LangGraph server configuration
├── pyproject.toml              # Python dependencies
├── Makefile                    # Development commands
└── Dockerfile                  # Container build
```

---

## Configuration

### Main Configuration (`config.yaml`)

Place in project root. Config values starting with `$` resolve as environment variables.

Key sections:
- `models` - LLM configurations with class paths, API keys, thinking/vision flags
- `tools` - Tool definitions with module paths and groups
- `tool_groups` - Logical tool groupings
- `sandbox` - Execution environment provider
- `skills` - Skills directory paths
- `title` - Auto-title generation settings
- `summarization` - Context summarization settings
- `subagents` - Subagent system (enabled/disabled)
- `memory` - Memory system settings (enabled, storage, debounce, facts limits)

Provider note:
- `models[*].use` references provider classes by module path (for example `langchain_openai:ChatOpenAI`).
- If a provider module is missing, Nion now returns an actionable error with install guidance (for example `uv add langchain-google-genai`).

### Extensions Configuration (`extensions_config.json`)

MCP servers and skill states in a single file:

```json
{
  "mcpServers": {
    "github": {
      "enabled": true,
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {"GITHUB_TOKEN": "$GITHUB_TOKEN"}
    },
    "secure-http": {
      "enabled": true,
      "type": "http",
      "url": "https://api.example.com/mcp",
      "oauth": {
        "enabled": true,
        "token_url": "https://auth.example.com/oauth/token",
        "grant_type": "client_credentials",
        "client_id": "$MCP_OAUTH_CLIENT_ID",
        "client_secret": "$MCP_OAUTH_CLIENT_SECRET"
      }
    }
  },
  "skills": {
    "pdf-processing": {"enabled": true}
  }
}
```

### Environment Variables

- `NION_CONFIG_PATH` - Override config.yaml location
- `NION_EXTENSIONS_CONFIG_PATH` - Override extensions_config.json location
- Model API keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY`, etc.
- Tool API keys: `TAVILY_API_KEY`, `GITHUB_TOKEN`, etc.

---

## Development

### Commands

```bash
make install    # Install dependencies
make dev        # Run LangGraph server (port 2024)
make gateway    # Run Gateway API (port 8001)
make lint       # Run linter (ruff)
make format     # Format code (ruff)
```

### Code Style

- **Linter/Formatter**: `ruff`
- **Line length**: 240 characters
- **Python**: 3.12+ with type hints
- **Quotes**: Double quotes
- **Indentation**: 4 spaces

### Testing

```bash
uv run pytest
```

---

## Technology Stack

- **LangGraph** (1.0.6+) - Agent framework and multi-agent orchestration
- **LangChain** (1.2.3+) - LLM abstractions and tool system
- **FastAPI** (0.115.0+) - Gateway REST API
- **langchain-mcp-adapters** - Model Context Protocol support
- **agent-sandbox** - Sandboxed code execution
- **markitdown** - Multi-format document conversion
- **tavily-python** / **firecrawl-py** - Web search and scraping

---

## Documentation

- [Configuration Guide](docs/CONFIGURATION.md)
- [Architecture Details](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [File Upload](docs/FILE_UPLOAD.md)
- [Path Examples](docs/PATH_EXAMPLES.md)
- [Context Summarization](docs/summarization.md)
- [Plan Mode](docs/plan_mode_usage.md)
- [Setup Guide](docs/SETUP.md)

---

## License

See the [LICENSE](../LICENSE) file in the project root.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
