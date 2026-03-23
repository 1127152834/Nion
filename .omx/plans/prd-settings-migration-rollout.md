# PRD: Settings Migration Rollout

## Objective

Replace YAML-first settings management with a donor-parity Config Center and settings system, while also transplanting the runtime/composer/workdir/plugin behavior those settings pages depend on, so the web product behaves like `Nion-Agent` without introducing multi-workspace complexity.

## Product Scope

- Single assistant
- Single app workspace
- Config-center-backed settings editing
- Chat runtime parity where required by settings
- Channel control-plane parity where required by settings
- Plugin management plus plugin assistant / studio parity if shipped

## Locked Decisions

- No multi-workspace management UI or product semantics.
- App data root: `~/.nion-data`
- App workspace root: `~/.nion-data/workspace`
- Distinguish:
  - app workspace
  - per-thread sandbox workdir
  - optional host-bound directory
- Web `host mode` means backend/server host execution.
- Web `host mode` does not require a directory picker up front.
- Thread outputs default to sandbox storage unless the conversation explicitly targets a host directory.
- Chat composer parity must include `Context`, `Skill`, `MCP`, and `CLI`.
- Workbench plugins cannot ship as dead settings UI.
- User-visible copy must use `Nion`.
- Donor deviations must be documented before acceptance.

## Success Criteria

- Settings shell, information architecture, section grouping, visible controls, and interaction order match donor expectations.
- Runtime behavior matches donor-required semantics where in scope.
- Saved config persists without editing `config.yaml`.
- Chat-page runtime/composer surfaces reflect saved configuration and preserve visible metadata in message flow.
- Plugin and channel flows are real, not placeholders, for any shipped module.
- End-to-end acceptance satisfies the browser-use acceptance spec.

## User Stories

### US-00 Config Center Foundation
As an operator, I can open a grouped settings dialog backed by a versioned config store and API, so settings no longer depend on YAML edits.

Acceptance:
- Config store boots empty/default without importing `config.yaml`
- `GET/PUT/validate/schema/runtime-status` config APIs work
- settings shell opens from the live app with grouped navigation

### US-00A Chat Runtime Workspace Foundation
As a user, I can choose sandbox or host runtime semantics and use the donor composer/runtime shell in chat, so settings correspond to real runtime behavior.

Acceptance:
- runtime profile persists per thread
- working-directory panel exists as a distinct surface
- single-workspace copy is present
- four composer shortcut lanes work end-to-end

### US-01 to US-13 Sectional Migration
As an operator, I can manage appearance, notifications, models, session policy, tools, MCP, skills, sandbox, channels, search, CLI tools, workbench plugins, and runtime diagnostics from the Nion settings shell, with each section wired to real runtime or persisted state.

Acceptance:
- each module satisfies its module plan
- each module satisfies the E2E acceptance matrix
- no regression breaks prior shipped modules

## Execution Rules

- Work strictly in module order: `00`, `00A`, `01` ... `13`
- Use one dedicated git worktree per module or key task
- Commit at key checkpoints using Lore protocol
- Run module-specific backend tests, `pnpm check`, and browser-use scenario evidence before advancing
- Do not claim completion until final regression and browser-use acceptance gate pass

