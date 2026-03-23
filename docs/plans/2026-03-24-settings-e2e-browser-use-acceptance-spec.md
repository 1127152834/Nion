# Settings Migration E2E Browser-Use Acceptance Spec

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Define strict end-to-end acceptance rules for the settings migration so no module is considered complete unless backend contracts, frontend UI, runtime behavior, and donor-parity flows pass both automated and operator-visible checks.

**Architecture:** Acceptance has three layers. Layer 1 is backend/unit/contract verification (`pytest`, config validation, API schema checks). Layer 2 is frontend compile/lint verification (`pnpm check`). Layer 3 is browser automation verification using `$browser-use`, covering real user flows, persistence, route/state transitions, and UI parity checkpoints. Modules that affect live chat/runtime behavior must additionally pass cross-module chat-page E2E, not only isolated settings-page checks.

**Tech Stack:** `browser-use` CLI, FastAPI test suite, `pnpm check`, browser screenshots, runtime fixtures

---

## Acceptance Policy

- No settings module is accepted by UI inspection alone.
- No settings module is accepted by `pnpm check` alone.
- No runtime-affecting module is accepted unless a real browser flow proves the saved state takes effect.
- Donor parity means:
  - matching information architecture
  - matching visible control set
  - matching primary interaction order
  - matching state transitions and disabled/error states
  - no missing business behavior hidden behind a visually similar UI
- If the target app intentionally diverges from donor behavior, the divergence must be explicitly written into the module plan before acceptance.

## Browser-Use Prerequisites

Before any E2E run:

1. App is running locally.
   - Recommended: `make dev`
   - Expected shell targets:
     - frontend via nginx: `http://localhost:2026`
     - gateway direct: `http://localhost:8001`
     - langgraph direct: `http://localhost:2024`
2. Test config store exists and is writable.
3. Test user flow starts from a fresh browser session.
4. `browser-use doctor` must pass.

If `browser-use doctor` fails, E2E is blocked and the module cannot be marked fully accepted.

## Standard Browser-Use Workflow

Use this sequence for every module:

```bash
browser-use open http://localhost:2026/workspace/chats/new
browser-use state
browser-use screenshot artifacts/e2e/<module>-00-entry.png
```

Then:

1. Discover relevant clickable elements via `browser-use state`
2. Interact using indices from that exact state snapshot
3. After each important action, run:
   - `browser-use state`
   - `browser-use screenshot artifacts/e2e/<module>-NN-<step>.png`
4. Verify persistence by:
   - closing and reopening the dialog/page, or
   - refreshing/navigating away and back, or
   - performing a real chat submission that consumes the saved config

## Required Evidence Per Module

For each module under `docs/plans/2026-03-23-settings-module-*.md`, collect:

- 1 entry screenshot
- 1 screenshot of the primary interaction state
- 1 screenshot after save/persist
- 1 screenshot after reload/reopen proving persistence
- a short log of the exact `$browser-use` commands used
- pass/fail notes for every acceptance item

Recommended artifact path:

```text
artifacts/e2e/settings/<module-name>/
```

## Core Cross-Module E2E Scenarios

These are mandatory in addition to module-local checks.

### Scenario A: Config Center Shell

**Purpose:** prove the migrated shell is real, grouped, navigable, and stable.

Flow:

1. Open `/workspace/chats/new`
2. Open the sidebar menu
3. Open settings
4. Assert grouped navigation is visible
5. Switch between at least 3 sections
6. Close settings
7. Reopen settings on a requested default section

Pass criteria:

- dialog opens reliably from the shell entry point
- section navigation updates the right content panel
- default-section deep link/open behavior works
- no visible stale DeerFlow wording remains in the touched shell

### Scenario B: Appearance Persistence

**Purpose:** prove the lowest-risk module still persists and reloads correctly.

Flow:

1. Open Appearance
2. Change theme
3. Change language
4. Close dialog
5. Refresh
6. Reopen dialog

Pass criteria:

- changed values persist
- shell copy reflects selected language
- visual selection state matches saved setting

### Scenario C: Chat Runtime / Working Directory / Host-Sandbox Semantics

**Purpose:** prove runtime behavior, not just settings copy.

Flow:

1. Open `/workspace/chats/new`
2. Verify runtime mode toggle exists
3. Verify working-directory trigger exists
4. Toggle sandbox/host
5. Reopen page or reload
6. Re-check runtime state
7. If host directory binding is part of the environment, bind one and verify lock/persistence rules

Pass criteria:

- web host mode is selectable without an upfront directory picker
- sandbox/host copy matches the intended web semantics
- working-directory panel opens distinctly from the artifact list
- persisted runtime profile survives reopen/reload

### Scenario D: Composer Shortcut Lanes

**Purpose:** prove the four-lane donor contract exists end-to-end.

Flow:

1. Open `/workspace/chats/new`
2. Verify these four lanes exist in the composer:
   - `Context`
   - `Skill`
   - `MCP`
   - `CLI`
3. Select at least one item from each available lane
4. Verify button counts update
5. Verify inline summary strip renders the selections
6. Submit a chat message
7. Verify outgoing message / subsequent UI still makes the selected context visible or diagnosable

Pass criteria:

- each lane opens its own selector
- selected counts and summary strip update correctly
- selected data is not silently dropped on submit
- resulting message/runtime behavior reflects the selected lane context

### Scenario E: Model And Session Policy Effectiveness

**Purpose:** prove settings affect runtime, not only saved JSON.

Flow:

1. Open Model settings and change model-related values
2. Open Session Policy settings and change at least one policy control
3. Save
4. Return to chat
5. Open the composer / model picker / relevant runtime UI

Pass criteria:

- saved model configuration is visible from the chat surface
- session policy settings produce the expected runtime behavior or visible state

### Scenario F: Skills / MCP / CLI Interoperability

**Purpose:** prove settings surfaces and composer/runtime surfaces use the same source of truth.

Flow:

1. Enable/disable or modify one skill/MCP/CLI entry in settings
2. Return to chat composer
3. Open the corresponding shortcut lane
4. Verify the available catalog reflects the change

Pass criteria:

- settings-side state and composer-side state stay aligned
- disabled items do not appear as active options

### Scenario G: Plugin Management And Plugin Studio

Run only if Module 12 is shipped.

Flow:

1. Open Workbench Plugins settings
2. Verify installed/built-in list renders
3. Trigger create-plugin entry
4. Verify plugin assistant route opens
5. Verify session bootstraps
6. If supported in the environment:
   - seed to workdir
   - pull from workdir
   - package draft

Pass criteria:

- plugin settings page is not dead UI
- create-plugin action opens a real flow
- package/debug path is reachable and stateful

### Scenario H: Final Regression Walkthrough

Flow:

1. Open `/workspace/chats/new`
2. Open settings and visit all shipped sections
3. Save a representative change in each shipped module
4. Submit a representative chat with shortcut-lane selections
5. Open working-directory panel
6. Reopen settings
7. Reload the page
8. Re-verify persisted state

Pass criteria:

- no broken navigation
- no broken dialog state
- no broken chat page after settings changes
- no module regresses another module's visible behavior

## Module-Specific Acceptance Matrix

Use this matrix on top of each module's local checklist.

### Module 00

- Config API endpoints respond successfully
- grouped shell opens from the live app
- no YAML-first copy remains in touched settings shell

### Module 00A

- runtime mode toggle works
- working-directory panel opens
- four composer lanes work end-to-end
- single-workspace model is reflected in UI copy

### Module 01

- theme cards match expected donor structure
- language switch updates visible copy

### Module 02

- permission state, denied state, and test notification are all reachable

### Module 03

- model add/edit/remove is reflected in chat-facing model state

### Module 04

- policy settings save
- affected runtime behavior is visible from a chat flow

### Module 05

- built-in tool groups render
- tool state changes persist

### Module 06

- MCP config state persists
- composer MCP lane reflects active server/tool state

### Module 07

- skill config state persists
- composer Skill lane reflects active skill state

### Module 08

- strict-mode and invalid-combination guards render correctly
- host/sandbox language matches web runtime semantics

### Module 09

- channel config CRUD works
- runtime/operator state is visible

### Module 10

- only supported search providers are rendered as actionable

### Module 11

- CLI marketplace/install state is visible if shipped
- composer CLI lane reflects the same source of truth

### Module 12

- plugin management is real
- plugin assistant/studio flow is real if shipped

### Module 13

- runtime diagnostics appear in web and desktop according to supported capability

## Final Acceptance Gate

The migration is only complete when all of the following are true:

1. `uv run pytest` passes
2. `pnpm check` passes
3. `$browser-use` prerequisite passes
4. Core scenarios A-H pass for the shipped module set
5. Required screenshots/logs are attached for review
6. No unresolved donor-parity gap remains undocumented

If any one of these fails, acceptance is incomplete.

## Current Environment Blocker

At the time this spec was drafted, the current shell reported:

```bash
browser-use: command not found
```

That means `$browser-use` E2E cannot be executed yet in this environment. The spec above is still the required acceptance contract; actual acceptance must wait until the CLI is installed and `browser-use doctor` passes.
