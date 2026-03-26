# Nion Desktop Development

## Goal

Nion Desktop is the only supported product surface in this branch. The application is packaged as an Electron single-window client plus a bundled local daemon.

## Local Workflow

1. Install dependencies:

```bash
make install
make desktop-install
```

2. Build the daemon runtime and shell:

```bash
make build-desktop
```

3. Launch the desktop app:

```bash
make desktop-dev
```

If the desktop shell and helper are already built, you can skip rebuilding:

```bash
make desktop-start
```

4. Run focused checks:

```bash
cd frontend && pnpm typecheck
cd desktop && pnpm test
cd backend && UV_LINK_MODE=copy uv run pytest -q
```

## Desktop Runtime Contract

- The Electron renderer is served from the privileged `nion://app` scheme, not `http://localhost`.
- The Python helper must accept CORS requests from `nion://app` because there is no nginx layer in desktop mode.
- `desktop/postcss.config.js` is required so Vite processes the shared Tailwind v4 stylesheet; without it the renderer falls back to mostly unstyled HTML.
- `make package-desktop-builder` publishes GitHub metadata by default; set `NION_UPDATE_BASE_URL` only when you want the optional generic/CDN update feed baked into the build.

## Packaging Lanes

- Canonical release lane: `electron-builder`
- Secondary verification lane: `electron-forge`

## Runtime Notes

- Electron starts the local daemon immediately on launch.
- The daemon binds to `127.0.0.1` only in Phase 01.
- `allow_background_running` is stored in Config Center and governs whether the daemon stays alive after Electron closes.
- When `allow_background_running` is disabled, the daemon exits after a short 2–3 second grace period once the Electron client detaches.
- Electron is single-window. A second app launch should focus the existing window instead of opening another one.
- `nion daemon status` and `nion daemon stop` talk to the same daemon that Electron uses.
- In Program 03C, daemon lifespan also owns `ChannelService` startup and shutdown, so channel self-operations now exist in desktop mode without relying on the gateway process.

## Control Plane Logging Coverage

The daemon control plane is expected to emit structured, human-readable events for at least these key areas:

- daemon lifecycle events
- client register / unregister events
- thread stream events
- delegated task lifecycle events
- subagent execution lifecycle events
- channel service lifecycle events
- channel message-bus events
- channel diagnostics
- channel runtime control actions
- task diagnostics
- skill mutation events
- config mutation events
- model/provider mutation events
- incident records
- chat-triggered diagnosis
- agent-execution incident playbooks
- suggested-action confirmation model
- desktop diagnostics center

The event store is machine-queryable, but `message` values should stay understandable to humans without requiring raw JSON inspection.

Delegated execution is correlated on `run_id`. Task-level diagnostics should be available from both:

- `GET /api/daemon/diagnostics/tasks/{task_id}`
- built-in control-plane tools such as `get_task_diagnostics`

Channel control-plane state should be available from:

- `GET /api/daemon/channels/*`
- built-in control-plane tools such as `get_channels_status`, `get_channel_diagnostics`, and the bounded channel action tools

Channel control-plane boundaries for Program 03C:

- `/api/daemon/channels/*` is the authoritative self-operations surface
- `/api/channels/*` remains for compatibility and operator UI
- approved runtime actions are restart, pairing code issuance, pair-request approve/reject, and authorized-user revoke
- config, credentials, and session override mutations are intentionally excluded from daemon channel control

Program 03D-A adds an incident workflow above the existing logs and diagnostics:

- incident records are persisted as structured diagnosis results rather than recomputed ad hoc from raw logs
- the first implementation path is chat-triggered diagnosis, not a desktop button and not auto-remediation
- the currently implemented agent-execution incident playbooks are:
  - `task_timeout`
  - `subagent_failure`
  - `tool_execution_failure`
  - `thread_stream_failure`
- the suggested-action confirmation model is explicit: diagnosis may propose bounded actions, but execution requires confirmation
- a desktop diagnostics center is designed to consume incident records later, but that UI is still deferred
- bridge/channel incidents and `daemon_runtime` playbooks are out of scope for this phase

## Known Blocker

`next build --webpack` under `output: "export"` is currently blocked by a Next.js 16 `/_global-error` prerender bug on this branch.
