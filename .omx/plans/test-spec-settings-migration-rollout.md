# Test Spec: Settings Migration Rollout

## Verification Layers

1. Backend/unit/contract verification via `uv run pytest`
2. Frontend compile and lint verification via `pnpm check`
3. Browser automation verification via `browser-use`
4. Final cross-module regression walkthrough after all shipped modules

## Global Gates

- `browser-use doctor` must pass before any module can be marked fully accepted.
- No module may advance without:
  - module-specific tests green
  - `pnpm check` green
  - relevant browser-use scenario evidence collected
  - screenshots and command log captured
- No final completion without Scenario H final regression evidence.

## Required Cross-Module Scenarios

- Scenario A: Config Center Shell
- Scenario B: Appearance Persistence
- Scenario C: Chat Runtime / Working Directory / Host-Sandbox Semantics
- Scenario D: Composer Shortcut Lanes
- Scenario E: Model And Session Policy Effectiveness
- Scenario F: Skills / MCP / CLI Interoperability
- Scenario G: Plugin Management And Plugin Studio
- Scenario H: Final Regression Walkthrough

## Module Matrix

### Module 00
- config API endpoints respond
- grouped shell opens
- no YAML-first copy in touched shell

### Module 00A
- runtime mode toggle works
- working-directory panel opens
- four composer lanes work end-to-end
- single-workspace model is reflected in copy

### Module 01
- theme cards match donor structure
- language switch updates copy

### Module 02
- permission, denied, and test-notification states are reachable

### Module 03
- model add/edit/remove affects chat-facing model state

### Module 04
- policy settings save and visible runtime behavior changes accordingly

### Module 05
- built-in tool groups render and persist state

### Module 06
- MCP config persists
- composer MCP lane reflects active state

### Module 07
- skill config persists
- composer Skill lane reflects active state

### Module 08
- strict-mode and invalid-combination guards render correctly
- host/sandbox language matches web semantics

### Module 09
- channel config CRUD works
- runtime/operator state is visible

### Module 10
- only supported search providers are actionable

### Module 11
- CLI marketplace/install state is real if shipped
- composer CLI lane reflects the same source of truth

### Module 12
- plugin management is real
- plugin assistant / studio flow is real if shipped

### Module 13
- runtime diagnostics appear in web and desktop according to supported capability

## Evidence Required Per Module

- worktree path
- modified files summary
- key commit hashes
- backend test results
- `pnpm check` result
- `browser-use` E2E result
- screenshot paths
- gate decision: pass / blocked

## Final Acceptance Gate

Completion requires all of the following:

- repository-wide relevant `pytest` coverage for shipped changes passes
- `pnpm check` passes
- `browser-use doctor` passes
- all required scenarios A-H pass for the shipped module set
- screenshots and browser-use command logs exist for review
- any donor deviation is documented
- no unresolved UI, business-logic, state-flow, message-visibility, or plugin-flow mismatch remains

