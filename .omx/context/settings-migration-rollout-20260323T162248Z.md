# Ralph Context Snapshot

- Task statement:
  Complete the full settings migration rollout for `nion` using the plans under `docs/plans`, implementing donor-parity UI, interaction order, runtime semantics, persistence, and business logic from `Nion-Agent`, with strict sequential module gates and browser E2E verification.
- Desired outcome:
  A shipped settings/config-center/runtime migration across Modules `00`, `00A`, `01`-`13`, implemented in isolated git worktrees with Lore commits, verified by backend tests, `pnpm check`, and `browser-use` E2E evidence.
- Known facts / evidence:
  - The required plan set exists locally under `docs/plans/2026-03-23-settings-*.md` and `docs/plans/2026-03-24-settings-e2e-browser-use-acceptance-spec.md`.
  - The donor reference repo is `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent`.
  - The current repo backend package root is `backend/packages/harness/nion`, not `backend/packages/harness/deerflow`; plan file path references must be mapped onto current package paths.
  - Current repo already has partial settings/chat surfaces, but not the config-center/runtime parity required by the plans.
  - `browser-use` is currently unavailable in this environment: `browser-use: command not found`.
  - A stale Module 00 worktree/branch was explicitly abandoned by the user and removed before restarting.
- Constraints:
  - Use `$ralph` persistence until the rollout is complete.
  - No multi-workspace product logic. Product model is single assistant, single workspace.
  - Default app data root must become `~/.nion-data`.
  - App workspace root must be `~/.nion-data/workspace`.
  - Web `host mode` is valid and maps to backend/server host execution, not desktop-only behavior.
  - The chat composer must reproduce the four shortcut lanes: `Context`, `Skill`, `MCP`, `CLI`.
  - Workbench plugin parity includes real plugin assistant / plugin studio flow if shipped.
  - User-visible branding must say `Nion`, not `DeerFlow`.
  - Each module or key task must execute in its own git worktree with Lore commits at key checkpoints.
  - Browser E2E is mandatory; no final acceptance without `browser-use doctor` passing and scenario evidence collected.
- Unknowns / open questions:
  - What exact install path/package is needed to restore `browser-use` on this machine.
  - How much of donor Modules `11`-`13` already exists in the current repo versus needing new backend/frontend surfaces.
  - Which donor path names have drifted beyond the already-known `deerflow` -> `nion` package rename.
- Likely codebase touchpoints:
  - `backend/packages/harness/nion/config/*`
  - `backend/packages/harness/nion/agents/middlewares/thread_data_middleware.py`
  - `backend/app/gateway/app.py`
  - `backend/app/gateway/routers/*`
  - `backend/app/channels/*`
  - `frontend/src/components/workspace/settings/*`
  - `frontend/src/components/workspace/*`
  - `frontend/src/core/{threads,messages,mcp,skills,models,settings}/*`
  - future additions under `frontend/src/core/{config-center,runtime,cli,channels,workbench}/*`

