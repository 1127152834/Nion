# Local Daemon, Electron, and CLI Design

## Goal

Reshape Nion's desktop architecture around a single local daemon that owns the runtime, while both Electron and a future terminal UI act as clients. The daemon must be able to start on demand, survive Electron window closure when allowed by settings, and provide a shared conversation/runtime surface for GUI and CLI users.

## Decisions

- Replace the current Electron-managed backend child process model with one single local daemon.
- The daemon embeds `NionClient` directly and does not launch standalone `langgraph dev`.
- Electron is a single-window client only.
- CLI is a first-class product surface and may have multiple concurrent sessions.
- Both Electron and CLI can lazily start the daemon if it is not already running.
- The "allow background running" setting only governs Electron's effect on daemon lifetime.
- When Electron closes:
  - if background running is enabled, daemon stays alive
  - if background running is disabled, daemon exits only when no CLI sessions remain

## Current-State Constraints

The current repository is still centered on an Electron shell that starts a local helper process:

- [desktop/src/main/index.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/index.ts)
- [desktop/src/main/backend-supervisor.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/backend-supervisor.ts)

There is no real end-user `nion` CLI today. The existing `/api/cli/catalog` surface is only a detected-tool catalog, not a conversational CLI:

- [backend/app/gateway/routers/cli.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/cli.py)

The strongest reusable primitive is `NionClient`, which already supports direct chat and streaming without requiring a separate LangGraph server process:

- [backend/packages/harness/nion/client.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py)

## Proposed Architecture

The local product becomes three surfaces over one runtime:

1. `niond`
   The only long-lived local daemon. It embeds `NionClient`, owns runtime state, thread access, settings, streaming, logs, and client registration.

2. Electron
   A GUI client. It does not own agent execution and does not supervise child backend processes. It only ensures the daemon exists, then connects to it.

3. `nion`
   The unified command entry. It exposes daemon management commands and a TUI chat client. The TUI is a client of `niond`, not a second runtime implementation.

This structure keeps state in one place, eliminates duplicated runtime lifecycles, and allows GUI and terminal experiences to share the same threads and daemon state.

## Daemon Lifecycle

The daemon should be single-instance and demand-started.

- Electron startup:
  - probe local daemon
  - if absent, launch it
  - connect and open the UI
- CLI startup:
  - probe local daemon
  - if absent, launch it
  - connect and start the TUI

Electron remains single-window. A second launch should activate the existing window rather than create a new one.

The daemon tracks client sessions by type:

- Electron clients
- CLI clients

The `allow_background_running` setting is enforced inside the daemon:

- Electron exits + setting on => daemon remains alive
- Electron exits + setting off + CLI sessions exist => daemon remains alive
- Electron exits + setting off + no CLI sessions exist => daemon exits

No idle grace period is required because only one Electron client is allowed and the desired product semantics are explicit.

## Transport and API

The daemon exposes a local HTTP/SSE API on `127.0.0.1`.

This is preferred over split Electron IPC plus direct Python CLI integration because:

- Electron and CLI can share one protocol
- the existing frontend already leans on HTTP/SSE
- debugging and observability are simpler
- there is one runtime contract instead of two drifting ones

The first version should expose a deliberately small API:

- control:
  - `GET /health`
  - `GET /runtime-info`
  - `GET /settings`
  - `PUT /settings`
  - `POST /daemon/stop`
- threads:
  - `GET /threads`
  - `POST /threads`
  - `GET /threads/:id/state`
  - `POST /threads/:id/stream`
- clients:
  - `POST /clients/register`
  - `POST /clients/:id/heartbeat`
  - `DELETE /clients/:id`

The streaming endpoint should map directly onto `NionClient.stream()` output.

## GUI and TUI Data Flow

Electron and TUI should both be treated as clients of the same daemon, not as separate execution environments.

Electron flow:

1. ensure daemon
2. register client session
3. read settings/runtime info
4. list/open threads
5. submit messages and receive SSE events

CLI flow:

1. ensure daemon
2. register CLI session
3. enter interactive TUI
4. list/open threads
5. submit messages and receive streaming output

The current desktop runtime adapter in:

- [frontend/src/core/api/desktop-client.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/api/desktop-client.ts)

can serve as a starting point, but it should evolve into a formal local runtime client rather than remain a narrow Electron-only adaptation layer.

## Settings

`allow_background_running` must be a daemon-owned setting persisted in the main configuration system, not an Electron-local preference.

User-visible first-version settings:

- `allow_background_running`

Internal, initially non-user-facing settings:

- local listen port
- daemon startup timeout

When Electron changes `allow_background_running`, the daemon should persist and apply it immediately.

## Local Security Model

Even though transport is local HTTP, the daemon should not be an unauthenticated open port.

First version:

- bind to `127.0.0.1` only
- generate a local access token on first boot
- store the token in the user data directory
- require Electron and CLI to present the token

This is enough to avoid a completely open local control plane without prematurely introducing a more complex socket or broker model.

## Error Handling

The design needs four explicit error classes:

1. Daemon start failure
   Port conflicts, bad config, missing credentials, or bootstrap failures. Electron should show a diagnostics screen. CLI should print an actionable failure.

2. Client/daemon version mismatch
   Electron, CLI, and daemon should compare versions through `runtime-info` and reject unsupported combinations.

3. Stale instance metadata
   Lock files or pid markers may survive crashes. Startup logic should detect dead instances and clean them.

4. Thread/runtime failure
   Model errors and tool failures must stay thread-scoped. They should not crash the daemon.

## Non-Goals

- Do not preserve a separate standalone `langgraph dev` local process for desktop/CLI mode.
- Do not make Electron responsible for backend supervision.
- Do not build two separate protocols for GUI and CLI.
- Do not add tray/menu-bar/login-item behavior in the first milestone.

## Phased Delivery

### Phase 1: Local Daemon Core

- create daemon process surface
- embed `NionClient`
- add single-instance lock
- add local HTTP/SSE endpoints
- add client registration and lifetime tracking

### Phase 2: Electron Becomes a Client

- remove backend child-process ownership from Electron
- add lazy daemon start/probe
- keep single-window behavior
- wire settings and shutdown semantics

### Phase 3: Unified `nion` CLI

- add `nion daemon status|stop|logs`
- add `nion tui`
- reuse the same local daemon API

## Validation Criteria

The design is successful when all of the following are true:

- No standalone `langgraph dev` process is required for the local desktop/CLI product.
- Electron does not own the backend lifecycle beyond "ensure daemon exists".
- There is exactly one local daemon runtime.
- Electron windows are single-instance.
- Multiple CLI sessions can attach simultaneously.
- GUI and CLI share thread state and stream responses from the same daemon.
- Closing Electron honors `allow_background_running` without killing active CLI work.

## Recommended Next Step

Write an implementation plan around three streams:

- daemon core and process model
- Electron client conversion
- CLI/TUI introduction

That plan should be executed in an isolated worktree because it will touch backend runtime, desktop lifecycle, packaging, and user-facing settings.
