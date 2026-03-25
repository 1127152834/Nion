# Local Runtime Program 01: Daemon Core and Electron Client Design

## Goal

Move the local runtime from Electron-owned helper supervision to a single local daemon, while keeping the current desktop UI working. In this phase, Electron becomes a single-window client that starts the daemon immediately, connects to it, and exposes the existing workspace experience without changing the user-visible product shape.

## Scope

In scope:

- local daemon process ownership
- Electron client conversion
- compatible `/api/*` surfaces for the current renderer
- daemon-owned `allow_background_running` setting
- settings UI placement for that setting
- close/exit behavior when background running is disabled

Out of scope:

- CLI/TUI
- tray/menu-bar behavior
- login-item/autostart integration
- multi-window Electron
- local token authentication

## Recommended Direction

Use the least disruptive migration path:

1. Keep the current desktop UI and its API expectations intact.
2. Start the daemon as soon as Electron launches.
3. Move lifecycle ownership out of `backend-supervisor.ts` and into the daemon.
4. Persist `allow_background_running` in the existing config center rather than in renderer-local storage.
5. Bind the daemon to `127.0.0.1` only and rely on loopback isolation for Phase 01.

This matches the current codebase better than a larger API redesign because the frontend already depends on desktop-specific backend resolution and the runtime already has a reusable in-process agent core via `NionClient`.

## Architecture

### Daemon

The daemon is the long-lived local runtime. It owns:

- agent execution
- thread state
- settings/runtime policy
- shutdown policy
- client session tracking

The daemon should expose the same local HTTP/SSE contract needed by the current renderer, rather than forcing a renderer rewrite in this phase.

### Electron

Electron becomes a client of the daemon. It should:

- start the daemon immediately on app launch
- keep a single window instance
- connect the renderer to the daemon base URL
- stop supervising a separate backend child process
- honor daemon shutdown state when the window closes

### Configuration

`allow_background_running` becomes a daemon-owned setting in Config Center storage.

It should be surfaced in the settings UI under the visible runtime/general area, not hidden in advanced settings. That keeps the behavior discoverable because it directly changes whether closing the window ends the local runtime.

## Data Flow

### Startup

1. Electron launches.
2. Electron ensures the daemon is running.
3. Electron receives the daemon base URL/runtime info.
4. Electron opens the single main window.
5. The renderer talks to the daemon through the existing desktop client layer.

### Closing the window

1. User closes the Electron window.
2. Electron tells the daemon that the Electron client has detached.
3. If `allow_background_running = true`, the daemon stays alive.
4. If `allow_background_running = false`, the daemon waits a short grace period, then exits if nothing else is keeping it alive.

The grace period should be short, around 2–3 seconds, to avoid accidental exits from a transient close/reopen.

## Compatibility Rules

- Preserve current renderer expectations where possible.
- Keep the existing desktop base URL resolution path working.
- Avoid introducing a second protocol for the same UI in this phase.
- Do not require standalone `langgraph dev` for desktop runtime use.
- Do not add a local token layer in Phase 01.
- Keep the daemon bound to `127.0.0.1` only.

## Error Handling

### Daemon start failure

If the daemon fails to start or becomes unhealthy, Electron should surface the failure clearly rather than hanging indefinitely.

### Stale runtime state

Startup should tolerate stale local process metadata from a previous crash and recover cleanly.

### Runtime/API mismatch

If the daemon and Electron disagree on the expected runtime shape, the failure should be explicit and actionable instead of silently degrading.

### Thread/runtime failures

Agent or thread errors should stay thread-scoped and not crash the daemon process.

## Testing Strategy

Phase 01 should be covered with focused unit/integration tests around the behavior being changed:

- config tests for the typed daemon settings surface
- gateway config schema tests for the new daemon section
- daemon session/lifecycle tests for background-running behavior
- local daemon API tests for health, runtime info, and protected routes
- Electron startup tests for immediate daemon launch and single-window behavior
- desktop client tests for daemon base URL resolution and thread API compatibility
- settings tests for the new `allow_background_running` UI placement

## Validation Criteria

This phase is done when:

- Electron launches the daemon immediately.
- The desktop UI still works against the daemon.
- Electron no longer owns backend helper supervision.
- `allow_background_running` is persisted in config center and visible in settings.
- Closing Electron with background running disabled exits the daemon after a short grace period.
- No local token/auth layer has been introduced.
- The renderer still consumes compatible `/api/*` behavior.

## Decision Summary

This design intentionally favors compatibility and operational stability over a larger runtime rewrite. It matches the current code structure, keeps user-facing behavior stable, and creates a clean base for the later CLI/TUI phases.
