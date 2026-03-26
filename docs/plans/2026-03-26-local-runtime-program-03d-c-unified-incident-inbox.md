# Local Runtime Program 03D-C: Unified Incident Inbox Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a single desktop-facing Incident Inbox that aggregates daemon incidents and bridge incidents into one read/action surface without changing ownership of either incident system.

**Architecture:** Keep daemon and bridge incident storage/diagnosis separate, add a desktop-main Incident Inbox Controller that reads both sources and normalizes them into one list/detail model, then expose that controller over dedicated inbox IPC for a new renderer-facing Incident Inbox UI. Route dismiss and run-action calls back to the correct owner based on `source_kind`.

**Tech Stack:** Electron main process, TypeScript, existing daemon incident APIs, existing bridge incident controller, desktop IPC, React frontend, existing bridge/desktop UI patterns, node `--test`, frontend `node --test`, `pnpm typecheck`

---

## Pre-Read

Read these before changing code:

- Program 03D-A docs:
  - `docs/plans/2026-03-26-local-runtime-program-03d-a-incident-workflow-design.md`
  - `docs/plans/2026-03-26-local-runtime-program-03d-a-incident-workflow.md`
- Program 03D-B docs:
  - `docs/plans/2026-03-26-local-runtime-program-03d-b-bridge-incident-workflow-design.md`
  - `docs/plans/2026-03-26-local-runtime-program-03d-b-bridge-incident-workflow.md`
- Current desktop runtime:
  - `desktop/src/main/index.ts`
  - `desktop/src/shared/ipc.ts`
  - `desktop/src/shared/bridge-ipc.ts`
- Bridge runtime:
  - `desktop/src/main/bridge/incident-playbooks.ts`
  - `desktop/src/main/bridge/action-runner.ts`
  - `desktop/src/main/bridge/incidents-store.ts`
- Current bridge UI:
  - `frontend/src/core/bridge/client.ts`
  - `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
  - `frontend/src/components/workspace/bridge/BridgeDiagnosticsSection.tsx`
  - `frontend/src/components/workspace/bridge/BridgeIncidentsPanel.tsx`
- Current daemon incident surface:
  - `backend/app/daemon/routers/incidents.py`
  - `backend/packages/harness/nion/tools/builtins/control_plane_tools.py`

Constraints to preserve:

- Do not merge daemon and bridge storage.
- Do not move bridge ownership out of Electron main.
- Renderer must consume one inbox IPC surface, not fan out to daemon and bridge directly.
- Incident Inbox is a unified product surface, not a raw logs console.
- Keep dismiss / run-action source-aware and routed through the correct owner.

## Task 1: Add Desktop-Main Incident Inbox Controller and IPC Contract

**Files:**
- Create: `desktop/src/main/incident-inbox.ts`
- Modify: `desktop/src/shared/ipc.ts`
- Modify: `desktop/src/main/index.ts`
- Create: `desktop/tests/incident-inbox-controller.test.mjs`
- Create: `desktop/tests/incident-inbox-ipc.test.mjs`

**Step 1: Write the failing tests**

Create tests for:

- normalizing daemon and bridge incidents into one list
- source-aware sorting and filtering
- `incident-inbox:list`
- `incident-inbox:get`
- `incident-inbox:dismiss`
- `incident-inbox:run-action`

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/incident-inbox-controller.test.mjs tests/incident-inbox-ipc.test.mjs
```

Expected: `FAIL`

**Step 3: Implement controller**

Create `desktop/src/main/incident-inbox.ts` that:

- fetches daemon incidents through backend HTTP
- fetches bridge incidents through bridge controller/store
- normalizes both into one list/detail model
- routes dismiss and run-action based on `source_kind`

Update `desktop/src/shared/ipc.ts` with:

- `incident-inbox:list`
- `incident-inbox:get`
- `incident-inbox:dismiss`
- `incident-inbox:run-action`

Wire the handlers in `desktop/src/main/index.ts`.

**Step 4: Run tests to verify they pass**

Run the same command.

**Step 5: Commit**

```bash
git add desktop/src/main/incident-inbox.ts desktop/src/shared/ipc.ts desktop/src/main/index.ts desktop/tests/incident-inbox-controller.test.mjs desktop/tests/incident-inbox-ipc.test.mjs
git commit -F - <<'EOF'
Aggregate daemon and bridge incidents into one desktop inbox control plane

Constraint: Unified diagnostics must not erase daemon and bridge ownership boundaries
Rejected: Aggregate incidents in the renderer | would duplicate source-aware action routing and leak ownership details into UI code
Confidence: high
Scope-risk: moderate
Directive: Keep the desktop-main inbox controller a read/action router, not a third diagnosis engine
Tested: cd desktop && node --test tests/incident-inbox-controller.test.mjs tests/incident-inbox-ipc.test.mjs
Not-tested: Large mixed-source incident histories
EOF
```

## Task 2: Add a Renderer Incident Inbox Client

**Files:**
- Create: `frontend/src/core/incident-inbox/client.ts`
- Create: `frontend/src/core/incident-inbox/client.test.ts`
- Modify: `desktop/src/preload/index.ts`
- Modify: `desktop/src/shared/ipc.ts`

**Step 1: Write the failing client tests**

Cover:

- desktop preload exposes inbox methods
- renderer client exposes:
  - `listIncidents`
  - `getIncident`
  - `dismissIncident`
  - `runAction`

**Step 2: Run tests to verify they fail**

Run relevant frontend node tests.

**Step 3: Implement renderer client**

Add a desktop-only Incident Inbox client analogous to the bridge client, but pointed at the new inbox IPC channels.

**Step 4: Run tests to verify they pass**

Run the same frontend client tests.

**Step 5: Commit**

```bash
git add frontend/src/core/incident-inbox/client.ts frontend/src/core/incident-inbox/client.test.ts desktop/src/preload/index.ts desktop/src/shared/ipc.ts
git commit -F - <<'EOF'
Expose the unified incident inbox to the desktop renderer

Constraint: The renderer should consume one inbox IPC surface rather than learn daemon and bridge ownership separately
Rejected: Reuse the bridge client for unified incidents | would bias the product surface toward one source and hide daemon incidents awkwardly
Confidence: high
Scope-risk: moderate
Directive: Keep incident inbox client read/action-oriented and separate from bridge-specific clients
Tested: run the relevant frontend incident-inbox client tests
Not-tested: Live renderer wiring in manual desktop sessions
EOF
```

## Task 3: Build the Unified Incident Inbox UI

**Files:**
- Create: `frontend/src/app/workspace/incidents/page.tsx`
- Create: `frontend/src/components/workspace/incidents/IncidentInboxLayout.tsx`
- Create: `frontend/src/components/workspace/incidents/IncidentList.tsx`
- Create: `frontend/src/components/workspace/incidents/IncidentDetail.tsx`
- Create: `frontend/src/components/workspace/incidents/IncidentActions.tsx`
- Create: tests for these components
- Modify any navigation entrypoint files as needed

**Step 1: Write the failing UI tests**

Cover:

- route exists
- incident list renders source/severity/status/summary
- detail panel renders explanation/evidence/action history
- action panel triggers confirm-before-run flow

**Step 2: Run tests to verify they fail**

Run relevant frontend tests.

**Step 3: Implement the inbox UI**

Use the unified inbox client only.

Do not recompute diagnosis in the renderer.

Keep the UI triage-oriented:

- list
- detail
- actions/history

**Step 4: Run tests to verify they pass**

Run the same tests plus `pnpm typecheck`.

**Step 5: Commit**

```bash
git add frontend/src/app/workspace/incidents/page.tsx frontend/src/components/workspace/incidents/*.tsx
git commit -F - <<'EOF'
Add a unified incident inbox UI for daemon and bridge failures

Constraint: The inbox must feel like a triage queue, not a raw logs console
Rejected: Recompute diagnosis in the renderer | would create a second diagnosis brain and drift from the underlying incident systems
Confidence: high
Scope-risk: moderate
Directive: Keep the first inbox focused on what broke, why, and what the user can do next
Tested: run relevant inbox UI tests and frontend type checks
Not-tested: Full manual desktop UX on real incidents
EOF
```

## Task 4: Integrate Existing Bridge Diagnostics Surface into the Unified Inbox

**Files:**
- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Modify: `frontend/src/components/workspace/bridge/BridgeDiagnosticsSection.tsx`
- Modify or remove: minimal bridge incident panel if now redundant
- Add/update tests

**Step 1: Write the failing integration tests**

Cover:

- bridge page links to or embeds the unified inbox correctly
- bridge-specific diagnostics section does not drift into a separate diagnosis engine
- no duplicate action execution path appears

**Step 2: Run tests to verify they fail**

Run bridge UI tests.

**Step 3: Implement integration**

Choose one of:

- bridge page links to unified inbox with bridge pre-filter
- bridge page embeds the same inbox components with source filter

Do not maintain two independent incident UIs.

**Step 4: Run tests to verify they pass**

Run bridge UI tests again.

**Step 5: Commit**

```bash
git add frontend/src/components/workspace/bridge/BridgeLayout.tsx frontend/src/components/workspace/bridge/BridgeDiagnosticsSection.tsx
git commit -F - <<'EOF'
Unify bridge diagnostics UI with the desktop incident inbox

Constraint: Bridge diagnostics must consume the same incident surface as the rest of the desktop product
Rejected: Keep a second parallel incident UI inside the bridge page | would fragment the product again after adding a unified inbox
Confidence: high
Scope-risk: moderate
Directive: If a bridge-specific diagnostics view remains, it must be a filtered presentation of the shared inbox rather than an independent control surface
Tested: run bridge UI integration tests
Not-tested: Long-session ergonomics with many mixed incidents
EOF
```

## Task 5: Add i18n, Docs, and Final Verification

**Files:**
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `README.md`
- Modify: `docs/desktop/development.md`
- Add/update coverage tests for docs and i18n if needed

**Step 1: Add failing coverage tests**

Require docs to mention:

- unified incident inbox
- daemon + bridge aggregation
- suggestion-first action routing
- first-version source kinds

Require i18n to cover the new inbox UI copy.

**Step 2: Run tests to verify they fail**

Run the relevant frontend/docs tests.

**Step 3: Update docs and translations**

Document:

- unified inbox responsibilities
- what sources are aggregated now
- what remains deferred

**Step 4: Run final verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/bridge-*.mjs tests/incident-inbox-*.mjs

cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/incidents/*.test.ts src/components/workspace/bridge/*.test.ts src/core/incident-inbox/*.test.ts src/core/i18n/locales/*.test.ts
pnpm typecheck
```

Plus any small backend sanity checks if daemon incident action routing was touched.

**Step 5: Commit**

```bash
git add frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts README.md docs/desktop/development.md
git commit -F - <<'EOF'
Document the unified incident inbox and align its UI copy across the desktop app

Constraint: The incident inbox is a product surface above existing incident systems, not a replacement for their ownership boundaries
Rejected: Describe the inbox as a new single storage or diagnosis engine | that would misrepresent how daemon and bridge incidents still work
Confidence: high
Scope-risk: narrow
Directive: Keep future documentation explicit about which incident sources are aggregated versus merely planned
Tested: run unified inbox desktop/frontend tests and type checks
Not-tested: Full user study on the final triage workflow
EOF
```
