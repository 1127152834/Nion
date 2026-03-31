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
| **Config** (`/api/config`) | `GET /`; `GET /schema`; `POST /validate`; `PUT /`; `GET /runtime-status` |
| **Runtime Profile** (`/api/threads/{id}/runtime-profile`) | thread-scoped sandbox/host execution mode |
| **Files** (`/api/threads/{id}/files`) | thread workdir tree |
| **CLI** (`/api/cli/catalog`) | runtime-visible CLI catalog |
| **Model Admin** (`/api/model-admin`) | templates / providers / models / bindings |
| **Models** (`/api/models`) | runtime model catalog |
| **MCP** (`/api/mcp`) | MCP config surfaces |
| **Memory** (`/api/memory`) | memory data and config |
| **Notebook** (`/api/notebook`) | notebook CRUD / history / restore / import |
| **Projects** (`/api/projects`) | project list, dashboard, plans, threads, timeline, artifacts, memory, decisions |
| **Uploads** (`/api/threads/{id}/uploads`) | uploads list / delete |
| **Artifacts** (`/api/threads/{id}/artifacts`) | serve artifacts |
| **Suggestions** (`/api/threads/{id}/suggestions`) | follow-up question generation |

Memory currently uses the legacy `memory.json` path through `nion.agents.memory.*`.
Do not reintroduce provider-based memory, AutoDream, self-maintenance, heartbeat,
compaction, or rebuild behavior unless the user explicitly starts a new design cycle.

### Local Daemon Surface

The desktop local daemon reuses the gateway router modules directly. Keep its
route surface aligned with the renderer expectations, including:

- `/api/model-admin/*`
- `/api/threads/{thread_id}/runtime-profile`
- `/api/models`, `/api/config`, `/api/skills`, `/api/files`, `/api/cli/catalog`
- `/api/projects`
- `/api/memory`
- `/api/daemon/logs`, `/api/daemon/logs/tail`
- `/api/daemon/diagnostics`, `/api/daemon/diagnostics/threads/{thread_id}`, `/api/daemon/diagnostics/skills/{skill_name}`
- `/api/daemon/diagnostics/tasks/{task_id}`
- `/api/daemon/channels/*`

Bridge configuration direction:
- Bridge credentials, enabled flags, verification state, and defaults are moving into Config Center / `config.db`
- Bridge runtime state (bindings, offsets, incidents, observations, weixin account session data) remains desktop-local for now

If a gateway route is added and the Electron renderer consumes it, update
`app/daemon/app.py` too or the desktop shell will return 404 while the web/gateway
path keeps working.

When Electron reports `Timed out waiting for daemon health`, treat it as a daemon
startup regression first, not an Electron-only issue. Validate with:

- `cd backend && uv run python -m app.daemon.main`
- `make desktop-dev`

This catches truncated service modules, broken runtime factory exports, and
middleware import regressions before they are misdiagnosed as shell timing issues.

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
