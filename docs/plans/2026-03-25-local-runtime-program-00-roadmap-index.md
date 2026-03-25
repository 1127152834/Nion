# Local Runtime Program Roadmap

## Purpose

This roadmap groups the local daemon, Electron client, CLI, tray, autostart, and recovery work into one named series so the files are obviously part of the same program.

The series prefix is:

`2026-03-25-local-runtime-program-XX-<phase-name>.md`

Where:

- `00` is the roadmap index
- `01` through `09` are primary execution phases
- `90+` are deferred research or optional future tracks

This roadmap is based on:

- [2026-03-25-local-daemon-electron-cli-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-25-local-daemon-electron-cli-design.md)

## Main Sequence

### 00. Roadmap Index

- File: [2026-03-25-local-runtime-program-00-roadmap-index.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-25-local-runtime-program-00-roadmap-index.md)
- Purpose: Define the grouped plan series, ordering, dependencies, and reserved filenames.

### 01. Daemon Core and Electron Client

- File: [2026-03-25-local-runtime-program-01-daemon-core-electron-client.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/plans/2026-03-25-local-runtime-program-01-daemon-core-electron-client.md)
- Purpose: Build the single local daemon, move Electron to lazy-start + single-window client behavior, and add the daemon-owned `allow_background_running` setting.
- Status: Planned now

### 02. CLI and TUI MVP

- Reserved file: `docs/plans/2026-03-25-local-runtime-program-02-cli-tui-mvp.md`
- Purpose: Introduce `nion daemon status|stop|logs` and `nion tui`, both backed by the same local daemon.
- Depends on: `01`

### 03. CLI Command Surface Expansion

- Reserved file: `docs/plans/2026-03-25-local-runtime-program-03-cli-command-surface.md`
- Purpose: Add non-interactive CLI commands such as scripted chat submission, thread attach, export, and admin flows.
- Depends on: `02`

### 04. Tray and Background UX

- Reserved file: `docs/plans/2026-03-25-local-runtime-program-04-tray-background-ux.md`
- Purpose: Add tray/menu-bar behavior, clarify close-vs-quit semantics, and expose daemon background state to users.
- Depends on: `01`

### 05. Autostart and System Integration

- Reserved file: `docs/plans/2026-03-25-local-runtime-program-05-autostart-system-integration.md`
- Purpose: Add login-item/autostart support, install/uninstall integration, and OS-specific daemon registration.
- Depends on: `01`, `04`

### 06. Recovery and Resilience

- Reserved file: `docs/plans/2026-03-25-local-runtime-program-06-recovery-resilience.md`
- Purpose: Handle stale locks, crashed daemons, reconnection, restart handoff, and resilient reuse of existing local runtime state.
- Depends on: `01`, `02`

## Deferred Track

### 90. Multi-Window Runtime Strategy

- Reserved file: `docs/plans/2026-03-25-local-runtime-program-90-multi-window-runtime-strategy.md`
- Purpose: Revisit multi-window support only if the product decision changes.
- Status: Deferred

This track is intentionally outside the main sequence because the current product decision is single-window Electron.

## Recommended Execution Order

1. `01` Daemon Core and Electron Client
2. `02` CLI and TUI MVP
3. `04` Tray and Background UX
4. `05` Autostart and System Integration
5. `06` Recovery and Resilience
6. `03` CLI Command Surface Expansion

## Why This Order

- `01` creates the only runtime that everything else depends on.
- `02` proves GUI and terminal can share one daemon.
- `04` should land before `05` so autostart behavior matches the final tray/background UX.
- `06` is easier once both Electron and CLI are already real daemon clients.
- `03` is valuable, but it does not unblock the architectural foundation.

## Scope Rules

- Keep the main sequence focused on one daemon and one Electron window.
- Do not pull multi-window behavior into the main sequence unless the product decision changes.
- Treat `allow_background_running` as a daemon-owned setting throughout all phases.
- Reuse the same local HTTP/SSE contract for Electron and CLI unless a later design explicitly replaces it.
