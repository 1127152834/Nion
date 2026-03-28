# CodePilot CLI Full-Parity Replication Spec

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this spec task-by-task.

**Goal:** Replicate the user-visible `CodePilot` CLI Tools and desktop Terminal experience inside Nion with full product-behavior parity, while adapting only the implementation architecture and visual styling to Nion's existing `backend` / `frontend` / `desktop` split.

**Replication Rule:** Unless this document explicitly excludes a capability, `CodePilot` is the source of truth for:

- information architecture
- page structure
- entry points
- component hierarchy
- dialog flows
- runtime states
- install/update/add/remove behavior
- chat-composer CLI selection behavior
- desktop terminal behavior

**Allowed Adaptation Only In Two Places:**

1. **Implementation architecture**
   `CodePilot` uses Next.js API routes, `better-sqlite3`, Claude Agent SDK MCP injection, and Electron-local IPC. Nion must re-host the same product behavior through Python FastAPI, Python runtime tools, and Nion desktop IPC.

2. **Visual styling**
   Page layout, interaction logic, and content structure should match `CodePilot`, but colors, radius, spacing tokens, typography, and container chrome must align with Nion's design system.

---

## Explicit Exclusions

The following `CodePilot` capabilities are **not** part of the replication target and must not drive Nion scope:

- Claude Code CLI settings editing
- Claude Code install / health / conflict detection
- Claude CLI session scan and import
- any `~/.claude/settings.json`-only management workflow
- any `Claude Agent SDK`-specific resume / provider / session compatibility surface

This means the following `CodePilot` files are reference-only and **must not** be ported as product requirements:

- `../CodePilot/src/app/api/settings/route.ts`
- `../CodePilot/src/components/settings/CliSettingsSection.tsx`
- `../CodePilot/src/components/layout/ConnectionStatus.tsx`
- `../CodePilot/src/app/api/claude-sessions/route.ts`
- `../CodePilot/src/app/api/claude-sessions/import/route.ts`
- `../CodePilot/src/lib/claude-session-parser.ts`
- `../CodePilot/src/components/layout/ImportSessionDialog.tsx`
- `../CodePilot/src/app/api/claude-status/route.ts`
- `../CodePilot/src/components/setup/ClaudeCodeCard.tsx`

---

## Product Surfaces To Replicate

This replication target contains exactly three product surfaces:

1. **CLI Tools library / management page**
2. **Composer CLI selector + conversational CLI tool management**
3. **Desktop terminal drawer**

Nion's existing Python shell at `backend/packages/harness/nion/cli/` is **not** the primary target. If it is expanded later, that is an optional compatibility wrapper around the replicated subsystem, not the subsystem itself.

---

## CodePilot Source Of Truth

### A. CLI Tools library

**Primary source files:**

- `../CodePilot/src/app/cli-tools/page.tsx`
- `../CodePilot/src/components/cli-tools/CliToolsManager.tsx`
- `../CodePilot/src/components/cli-tools/CliToolCard.tsx`
- `../CodePilot/src/components/cli-tools/CliToolDetailDialog.tsx`
- `../CodePilot/src/components/cli-tools/CliToolExtraDetailDialog.tsx`
- `../CodePilot/src/components/cli-tools/CliToolInstallDialog.tsx`
- `../CodePilot/src/components/cli-tools/CliToolBatchDescribeDialog.tsx`
- `../CodePilot/src/components/cli-tools/CliToolAddDialog.tsx`
- `../CodePilot/src/lib/cli-tools-catalog.ts`
- `../CodePilot/src/lib/cli-tools-detect.ts`
- `../CodePilot/src/app/api/cli-tools/catalog/route.ts`
- `../CodePilot/src/app/api/cli-tools/installed/route.ts`
- `../CodePilot/src/app/api/cli-tools/custom/route.ts`
- `../CodePilot/src/app/api/cli-tools/custom/[id]/route.ts`
- `../CodePilot/src/app/api/cli-tools/[id]/status/route.ts`
- `../CodePilot/src/app/api/cli-tools/[id]/detail/route.ts`
- `../CodePilot/src/app/api/cli-tools/[id]/install/route.ts`
- `../CodePilot/src/app/api/cli-tools/[id]/describe/route.ts`
- `../CodePilot/src/app/api/cli-tools/descriptions/route.ts`
- `../CodePilot/src/lib/db.ts`
- `../CodePilot/src/types/index.ts`
- `../CodePilot/docs/handover/cli-tools.md`
- `../CodePilot/docs/insights/cli-tools.md`

**Behavioral ownership by file:**

- `CliToolsManager.tsx`
  owns page assembly, section order, fetch orchestration, empty-state decisions, add-tool entry, detail-dialog wiring, install-dialog wiring, and batch-describe wiring.
- `CliToolCard.tsx`
  owns the compact row-card interaction for `installed` and `recommended` variants.
- `CliToolDetailDialog.tsx`
  owns the rich detail experience for curated catalog tools.
- `CliToolExtraDetailDialog.tsx`
  owns the rich detail experience for extra detected and custom tools.
- `CliToolInstallDialog.tsx`
  owns streamed install-log rendering and success/error completion behavior.
- `CliToolBatchDescribeDialog.tsx`
  owns provider/model selection and batch AI description generation flow.
- `CliToolAddDialog.tsx`
  owns the manual absolute-path fallback path for custom binaries.
- `cli-tools-catalog.ts`
  owns the curated tool metadata model and install-method definitions.
- `cli-tools-detect.ts`
  owns runtime detection and version extraction.
- `db.ts`
  owns custom tool persistence, install metadata persistence, and description persistence.

### B. Composer CLI selector and conversational tool management

**Primary source files:**

- `../CodePilot/src/components/chat/CliToolsPopover.tsx`
- `../CodePilot/src/lib/cli-tools-mcp.ts`
- `../CodePilot/src/lib/claude-client.ts`

**Behavioral ownership by file:**

- `CliToolsPopover.tsx`
  owns the searchable CLI popover in the composer, keyboard navigation, empty state, and footer action routing to the CLI library page.
- `cli-tools-mcp.ts`
  owns the six runtime tool verbs and their contract semantics:
  - `list`
  - `install`
  - `add`
  - `remove`
  - `check_updates`
  - `update`
- `claude-client.ts`
  owns keyword-gated injection of the CLI-management capability into chat only when relevant.

### C. Desktop terminal

**Primary source files:**

- `../CodePilot/electron/terminal-manager.ts`
- `../CodePilot/electron/main.ts`
- `../CodePilot/electron/preload.ts`
- `../CodePilot/src/hooks/useTerminal.ts`
- `../CodePilot/src/components/terminal/TerminalDrawer.tsx`
- `../CodePilot/src/components/terminal/TerminalInstance.tsx`

**Behavioral ownership by file:**

- `terminal-manager.ts`
  owns shell process creation, write, resize, kill, and onData/onExit event fanout.
- `main.ts`
  owns the Electron IPC wiring for terminal lifecycle.
- `preload.ts`
  owns renderer-safe terminal API exposure.
- `useTerminal.ts`
  owns renderer-side session lifecycle.
- `TerminalDrawer.tsx`
  owns drawer shell, resize affordance, and desktop-only fallback.
- `TerminalInstance.tsx`
  owns terminal output rendering and keyboard input behavior.

---

## Nion Current Target Surfaces

These are the Nion files that must be replaced, widened, or used as landing zones.

### Existing thin CLI surface

- `backend/app/gateway/routers/cli.py`
- `backend/tests/test_cli_catalog_api.py`
- `frontend/src/core/cli/api.ts`
- `frontend/src/core/cli/hooks.ts`
- `frontend/src/core/cli/types.ts`
- `frontend/src/core/cli/presentation.ts`
- `frontend/src/components/workspace/settings/cli-tools-page.tsx`
- `frontend/src/components/workspace/input-box.tsx`
- `frontend/src/components/workspace/messages/message-list-item.tsx`
- `frontend/src/core/messages/utils.ts`
- `frontend/src/core/threads/hooks.ts`

### Existing desktop bridge points that must be widened

- `desktop/src/preload/index.ts`
- `desktop/src/shared/ipc.ts`
- `desktop/src/main/index.ts`

### Existing Nion design-shell containers that must be reused

- `frontend/src/components/workspace/settings/settings-dialog.tsx`
- `frontend/src/components/workspace/settings/settings-section.tsx`
- `frontend/src/components/ui/badge.tsx`
- other existing Nion UI primitives already used by the settings shell

---

## Non-Negotiable Parity Requirements

## 1. CLI Tools Library Page Must Match CodePilot Behavior

**Reference files:**

- `../CodePilot/src/app/cli-tools/page.tsx`
- `../CodePilot/src/components/cli-tools/CliToolsManager.tsx`

**Nion target files:**

- `frontend/src/components/workspace/settings/cli-tools-page.tsx`
- `frontend/src/components/workspace/cli-tools/*`
- `frontend/src/core/cli/*`
- `backend/app/gateway/routers/cli_tools*.py`

**Required page structure:**

1. Header area
   - title
   - description
   - context-aware top-right action when no tools are present
2. Installed section
   - only render if any installed catalog tool, extra detected tool, or custom tool exists
3. Recommended section
   - always render
4. Docs footer link
   - preserved as a low-emphasis footer affordance

**Required fetch model:**

The library page must resolve one aggregated view model equivalent to `CliToolsManager.tsx`:

- curated catalog definitions
- runtime status for curated tools
- extra system-detected tools
- custom tools
- persisted descriptions
- platform
- package-manager capability flags such as `hasBrew`

**Required grouping logic:**

- `installed catalog tools`
  curated tools whose runtime state is not `not_installed`
- `extra detected tools`
  system-detected non-catalog binaries
- `custom tools`
  user-registered binaries
- `recommended tools`
  curated tools not currently installed

**Required business logic:**

- the installed section must merge three lists exactly as `CodePilot` does:
  - installed curated tools
  - extra detected tools
  - custom tools
- the recommended section must contain only curated tools not currently installed
- batch AI describe must target only:
  - extra detected tools
  - custom tools
  and must not re-describe curated tools with built-in descriptions
- the `Add Tool` primary action must keep the same primary behavior as `CodePilot`:
  route into chat with a prefilled task prompt asking the assistant to install/add a CLI tool
- the manual add dialog must remain available as a fallback path, but must not replace the chat-first behavior as the main entry
- the Homebrew warning block under `Recommended` must be preserved for `darwin` and `linux` when `brew` is absent

## 2. Card-Level Behavior Must Match CodePilot

**Reference file:**

- `../CodePilot/src/components/cli-tools/CliToolCard.tsx`

**Required card semantics:**

- installed and recommended variants must share one card shape
- each card must show:
  - tool name
  - inline category chips for curated tools
  - version when installed
  - one-line summary or AI-generated description
- recommended cards must show install affordance on the right
- if a tool has one install method on this platform:
  install action is direct
- if a tool has multiple install methods on this platform:
  install action opens a local method picker

**Styling rule:**

Reuse Nion button, badge, border, and surface tokens, but preserve CodePilot's compact row-card density and action placement.

## 3. Detail Dialogs Must Match CodePilot

**Reference files:**

- `../CodePilot/src/components/cli-tools/CliToolDetailDialog.tsx`
- `../CodePilot/src/components/cli-tools/CliToolExtraDetailDialog.tsx`

**Required curated-tool dialog sections:**

- intro
- use cases
- guide steps
- example prompts with copy affordance
- external links
- bottom action:
  - `Install` for recommended tools
  - `Try It` for installed tools

**Required extra/custom dialog sections:**

- AI-generated intro if present
- structured use cases if present
- structured guide steps if present
- structured example prompts if present
- runtime info:
  - version
  - path
- bottom `Try It` action

**Required `Try It` behavior:**

`Try It` must route into chat with a prefilled prompt of the form:

- zh: `我想用 {toolName} 工具完成：`
- en: `I want to use {toolName} to:`

## 4. Install Dialog Must Match CodePilot

**Reference file:**

- `../CodePilot/src/components/cli-tools/CliToolInstallDialog.tsx`

**Required behavior:**

- open as modal dialog
- show selected install command in monospace
- stream log output incrementally
- maintain three visual phases:
  - `running`
  - `success`
  - `error`
- on close:
  - abort the underlying request if still running
  - trigger refresh only on successful completion

**Required transport contract:**

The backend install endpoint must support an SSE-style streamed response equivalent to the current `CodePilot` contract:

- `output`
- `done`
- `error`

Nion may implement this in Python, but the frontend contract must remain equivalent.

## 5. Batch Describe Dialog Must Match CodePilot

**Reference file:**

- `../CodePilot/src/components/cli-tools/CliToolBatchDescribeDialog.tsx`

**Required behavior:**

- modal with three modes:
  - select
  - running
  - done
- provider selector
- model selector
- optional `skip existing descriptions` toggle
- per-tool progress rows with:
  - pending
  - loading
  - success
  - error

**Adaptation rule:**

The provider/model selector should use Nion's existing model/provider runtime rather than `CodePilot`'s exact provider API, but the visible interaction model must stay the same.

**Required persistence behavior:**

Descriptions generated during batch describe must be written to Nion persistence immediately and reflected on cards without reload friction.

## 6. Manual Add Dialog Must Match CodePilot Fallback Behavior

**Reference file:**

- `../CodePilot/src/components/cli-tools/CliToolAddDialog.tsx`

**Required behavior:**

- absolute binary path input
- optional display name input
- inline validation/error state
- add action posts to custom-tool create endpoint

**Important constraint:**

This dialog is a fallback path only. The main product path for adding missing tools remains the chat-first `Add Tool` action.

## 7. Composer CLI Selector Must Match CodePilot

**Reference file:**

- `../CodePilot/src/components/chat/CliToolsPopover.tsx`

**Nion target files:**

- `frontend/src/components/workspace/input-box.tsx`
- `frontend/src/components/workspace/cli-tools/cli-tools-popover.tsx`

**Required behavior:**

- searchable popover
- keyboard navigation:
  - ArrowDown
  - ArrowUp
  - Enter
  - Escape
- each item shows:
  - terminal icon
  - tool name
  - version when present
  - summary when present
- empty state must include `Go install CLI tools`
- footer must include `Manage CLI tools`

**Required navigation behavior:**

Both the empty-state CTA and footer CTA must route to the same CLI Tools library page.

**Nion transport rule:**

The visible interaction must match `CodePilot`, but Nion must preserve its current message-transport machinery:

- `shortcutSelections.cliTools`
- `selected_cli_tools`
- `implicit_mentions`

This hidden transport layer may remain Nion-specific as long as the user-visible selector behavior is parity-equivalent.

## 8. Conversational CLI Tool Management Must Match CodePilot Semantics

**Reference file:**

- `../CodePilot/src/lib/cli-tools-mcp.ts`

**Nion target files:**

- Python runtime tool modules under `backend/packages/harness/nion/tools/cli_tools/`
- runtime registration points under `backend/packages/harness/nion/tools/`
- gateway services under `backend/app/services/`

**Required user-visible verbs:**

- list tools
- install tool
- add already-installed tool
- remove custom tool
- check updates
- update tool

**Required business logic:**

- install must:
  - execute install command
  - detect resulting binary path
  - extract version if possible
  - register the tool
  - persist install method
  - persist install package
  - return follow-up guidance if the tool requires auth/setup
- add must:
  - register an already-installed tool by absolute path
  - optionally persist description content
- remove must:
  - delete only custom tools
- check updates must:
  - inspect package-manager-specific outdated state
  - return actionable update candidates
- update must:
  - use stored `install_method` + stored `install_package`
  - never guess from display name alone

**Required keyword gating:**

Nion must reproduce the same product behavior as `CodePilot`:
the CLI-management capability is present in chat when the user is obviously discussing tool installation / updating / adding / removing / managing.

The gating implementation can be Python-native, but the resulting behavior must match the current `CodePilot` intent surface.

**Required no-new-logic rule:**

Do not invent a different Nion-specific management workflow. Recreate the same operational model through Nion's Python runtime.

## 9. Tool Metadata Model Must Match CodePilot's Product Contract

**Reference files:**

- `../CodePilot/src/lib/cli-tools-catalog.ts`
- `../CodePilot/src/types/index.ts`
- `../CodePilot/src/lib/db.ts`

**Required curated-tool fields:**

- `id`
- `name`
- `binNames`
- `summaryZh`
- `summaryEn`
- `categories`
- `installMethods`
- `setupType`
- `detailIntro`
- `useCases`
- `guideSteps`
- `examplePrompts`
- external links
- `supportsAutoDescribe`

**Required runtime states:**

- `not_installed`
- `installed`
- `needs_auth`
- `ready`

Nion may internally derive some of these states differently, but the frontend-visible state model must support the same UI behavior.

**Required persisted custom-tool fields:**

- `id`
- `name`
- `binPath`
- `binName`
- `version`
- `installMethod`
- `installPackage`
- `enabled`
- timestamps

**Required persisted description fields:**

- short zh description
- short en description
- structured JSON payload containing:
  - intro
  - useCases
  - guideSteps
  - examplePrompts

**Required dedupe rule:**

Custom tools must dedupe by absolute `binPath`, matching `CodePilot`'s idempotent behavior.

## 10. `/api/cli/catalog` Must Survive As A Compatibility Projection

**Reference current Nion files:**

- `backend/app/gateway/routers/cli.py`
- `frontend/src/core/cli/api.ts`
- `frontend/src/core/cli/hooks.ts`

**Required rule:**

Do not break the existing catalog endpoint while rebuilding the subsystem.

Instead:

- implement the richer source of truth behind new Nion routes/services
- keep `/api/cli/catalog` as a compatibility view backed by the richer model

This keeps the current input-box integration stable while the full parity UI is wired in.

## 11. Desktop Terminal Must Match CodePilot Behavior

**Reference files:**

- `../CodePilot/electron/terminal-manager.ts`
- `../CodePilot/electron/main.ts`
- `../CodePilot/electron/preload.ts`
- `../CodePilot/src/hooks/useTerminal.ts`
- `../CodePilot/src/components/terminal/TerminalDrawer.tsx`
- `../CodePilot/src/components/terminal/TerminalInstance.tsx`

**Nion target files:**

- `desktop/src/main/terminal-manager.ts`
- `desktop/src/main/index.ts`
- `desktop/src/preload/index.ts`
- `desktop/src/shared/ipc.ts`
- `frontend/src/hooks/use-terminal.ts`
- `frontend/src/components/workspace/terminal/*`

**Required behavior:**

- terminal appears as bottom drawer
- drawer has:
  - resize handle
  - header title
  - reset-height action
  - close action
- drawer height defaults to `250`
- minimum height `120`
- maximum height `600`
- terminal session is created against current working directory
- recreating terminal kills previous session for the same thread
- output is streamed incrementally
- ANSI output is rendered
- input box sends line on Enter
- desktop-only:
  non-desktop environments must show a graceful unavailable state

**Required implementation parity note:**

CodePilot's first version uses `child_process.spawn` rather than a true PTY and treats resize as a no-op. Nion should mirror that limitation in the first parity pass rather than inventing a different terminal architecture.

## 12. Visual Integration Rules

Nion must visually absorb the replicated surfaces into its design system without altering product behavior.

**Must reuse Nion styling primitives where possible:**

- settings shell
- section headers
- buttons
- badges
- dialogs
- typography scale
- spacing scale
- muted/background/border tokens

**Must preserve CodePilot interaction structure:**

- section order
- control placement
- action labels
- install button position
- dialog footer actions
- empty-state CTA placement
- popover footer behavior
- terminal drawer placement

**Practical rule:**

Copy the page/component skeleton and interaction logic, then reskin to Nion. Do not redesign the flow.

---

## Nion File Mapping

### Backend

- `../CodePilot/src/lib/cli-tools-catalog.ts`
  → `backend/app/services/cli_tools_catalog.py`
- `../CodePilot/src/lib/cli-tools-detect.ts`
  → `backend/app/services/cli_tools_detect.py`
- `../CodePilot/src/lib/cli-tools-mcp.ts`
  → `backend/packages/harness/nion/tools/cli_tools/*`
- `../CodePilot/src/app/api/cli-tools/*`
  → `backend/app/gateway/routers/cli_tools*.py`
- `../CodePilot/src/lib/db.ts`
  → Nion-native persistence layer under `backend/app/services/` or `backend/packages/harness/nion/`

### Frontend

- `../CodePilot/src/components/cli-tools/*`
  → `frontend/src/components/workspace/cli-tools/*`
- `../CodePilot/src/components/chat/CliToolsPopover.tsx`
  → `frontend/src/components/workspace/cli-tools/cli-tools-popover.tsx`
- `../CodePilot/src/app/cli-tools/page.tsx`
  → folded into Nion's settings page and route structure rather than a separate top-level app route

### Desktop

- `../CodePilot/electron/terminal-manager.ts`
  → `desktop/src/main/terminal-manager.ts`
- `../CodePilot/electron/preload.ts`
  → terminal extension inside `desktop/src/preload/index.ts`
- `../CodePilot/electron/main.ts`
  → terminal IPC registration inside `desktop/src/main/index.ts`
- `../CodePilot/src/hooks/useTerminal.ts`
  → `frontend/src/hooks/use-terminal.ts`
- `../CodePilot/src/components/terminal/*`
  → `frontend/src/components/workspace/terminal/*`

---

## Acceptance Criteria

The replication is complete only when all items below are true.

### CLI library parity

- Nion shows the same installed / recommended / extra / custom conceptual model as `CodePilot`.
- Curated tools have the same detail richness and install affordances.
- Extra and custom tools have the same detail dialog behavior and `Try It` flow.
- Batch AI describe exists and behaves the same.
- Add Tool enters chat-first flow and manual add remains fallback.

### Composer parity

- Composer CLI selector is searchable and keyboard navigable.
- Empty state offers go-install CTA.
- Footer offers manage-CLI CTA.
- Selecting tools produces the same visible UX as CodePilot while preserving Nion transport internals.

### Runtime parity

- Chat can list, install, add, remove, check updates, and update CLI tools.
- Install/update behavior uses stored install metadata rather than guessed package names.
- Keyword-gated capability exposure behaves like CodePilot.

### Terminal parity

- Desktop app exposes a bottom terminal drawer with the same interaction model.
- Web surfaces show terminal unavailable gracefully.
- Terminal output streams, renders ANSI, and accepts input.

### Exclusion correctness

- No Claude settings editor is added.
- No Claude session import is added.
- No Claude install / health / wizard surface is added.

---

## Final Rule For Implementation

If there is a conflict between:

- making the codebase feel more "Nion-native"
- and keeping product behavior aligned with `CodePilot`

choose `CodePilot` product behavior and adapt only the implementation shell and visual skin.

This is a replication task, not a redesign task.
