# Local Runtime Program 03D-B: Desktop Bridge Incident Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a desktop-owned bridge incident workflow that can diagnose bridge runtime failures, persist structured bridge incident records, and execute bounded, confirm-before-run recovery actions through Electron main and bridge IPC.

**Architecture:** Keep bridge incident ownership in `desktop/src/main/bridge/*`, add a desktop-side bridge observations/incident store under user data, expose diagnosis/list/get/dismiss/run-action through new bridge IPC channels, build deterministic bridge playbooks for the first four runtime incident types, then wire a lightweight bridge self-heal panel into the existing bridge UI. A richer diagnostics center is designed here but implemented later.

**Tech Stack:** Electron main process, TypeScript, file-backed JSON stores under desktop user data, preload IPC, existing bridge manager/adapters, frontend bridge client, node `--test`, pytest only where backend contracts are indirectly touched

---

## Pre-Read

Read these before changing code:

- `desktop/src/main/index.ts`
- `desktop/src/shared/bridge-ipc.ts`
- `desktop/src/main/bridge/bridge-manager.ts`
- `desktop/src/main/bridge/base-adapter.ts`
- `desktop/src/main/bridge/delivery-layer.ts`
- `desktop/src/main/bridge/channel-router.ts`
- `desktop/src/main/bridge/settings-store.ts`
- `desktop/src/main/bridge/bindings-store.ts`
- `desktop/src/main/bridge/weixin-store.ts`
- `frontend/src/core/bridge/client.ts`
- `frontend/src/components/workspace/bridge/BridgeSection.tsx`
- `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- current bridge contract tests under `desktop/tests/bridge-*.mjs`

Constraints to preserve:

- Do not reintroduce or depend on the removed backend `app/channels/*` subsystem.
- Bridge runtime ownership stays in Electron main.
- First version is suggestion-first. No automatic self-heal.
- First version implements these incident types only:
  - `bridge_manager_down`
  - `adapter_start_failure`
  - `adapter_runtime_failure`
  - `bridge_delivery_failure`
- `binding_resolution_error` and `permission_workflow_stuck` are designed, not implemented.
- Diagnostics center UI is lower priority than the self-heal workflow.

## Task 1: Add Bridge Observation and Incident Stores

**Files:**
- Create: `desktop/src/main/bridge/observations-store.ts`
- Create: `desktop/src/main/bridge/incidents-store.ts`
- Modify: `desktop/src/shared/bridge-ipc.ts`
- Create: `desktop/tests/bridge-incidents-store.test.mjs`
- Create: `desktop/tests/bridge-observations-store.test.mjs`

**Step 1: Write the failing tests**

Create store tests for:

- incident record persistence
- incident listing by status / severity / platform
- dismissing an incident
- appending bounded bridge observations
- observation retention/ring-buffer behavior if you choose to bound length

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/bridge-incidents-store.test.mjs tests/bridge-observations-store.test.mjs
```

Expected: `FAIL`

**Step 3: Implement stores**

Create:

- `observations-store.ts`
- `incidents-store.ts`

Both should use the existing file-backed JSON store style already used by bridge settings/bindings/weixin stores.

Also extend `desktop/src/shared/bridge-ipc.ts` with bridge incident types used later by IPC handlers.

**Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/bridge-incidents-store.test.mjs tests/bridge-observations-store.test.mjs
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add desktop/src/main/bridge/observations-store.ts desktop/src/main/bridge/incidents-store.ts desktop/src/shared/bridge-ipc.ts desktop/tests/bridge-incidents-store.test.mjs desktop/tests/bridge-observations-store.test.mjs
git commit -F - <<'EOF'
Persist bridge observations and incidents in desktop-owned stores

Constraint: Bridge runtime state is owned by Electron main, so bridge incidents must not be forced into backend incident storage
Rejected: Reuse backend incident_records for bridge failures | would attach desktop runtime ownership to the wrong process boundary
Confidence: high
Scope-risk: moderate
Directive: Keep bridge incident shape compatible with daemon incidents, but keep storage ownership in desktop main
Tested: cd desktop && node --test tests/bridge-incidents-store.test.mjs tests/bridge-observations-store.test.mjs
Not-tested: Large retained bridge incident histories
EOF
```

## Task 2: Instrument Bridge Manager and Runtime with Structured Observations

**Files:**
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Modify: `desktop/src/main/bridge/delivery-layer.ts`
- Optionally modify: adapter files only if strictly required
- Create: `desktop/tests/bridge-observations-contract.test.mjs`

**Step 1: Write the failing observation tests**

Add tests that prove structured observations are recorded for:

- manager start/stop
- adapter start failures
- adapter loop/runtime failures
- delivery failures

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/bridge-observations-contract.test.mjs tests/bridge-manager-behavior.test.mjs tests/bridge-delivery-contract.test.mjs
```

Expected: `FAIL`

**Step 3: Implement observation emission**

Record bounded observations such as:

- `bridge_manager_started`
- `bridge_manager_stopped`
- `adapter_start_failed`
- `adapter_runtime_error`
- `bridge_delivery_failed`

Do not store full message bodies. Prefer IDs, lengths, platform, binding/thread identifiers, and error strings.

**Step 4: Run tests to verify they pass**

Run the same command.

**Step 5: Commit**

```bash
git add desktop/src/main/bridge/bridge-manager.ts desktop/src/main/bridge/delivery-layer.ts desktop/tests/bridge-observations-contract.test.mjs
git commit -F - <<'EOF'
Capture structured bridge runtime observations for incident diagnosis

Constraint: Bridge diagnosis needs structured runtime evidence and cannot rely on console output alone
Rejected: Infer incidents only from live status snapshots | delivery and loop failures would be invisible once transient state clears
Confidence: high
Scope-risk: moderate
Directive: Keep bridge observations bounded and avoid persisting full message content
Tested: cd desktop && node --test tests/bridge-observations-contract.test.mjs tests/bridge-manager-behavior.test.mjs tests/bridge-delivery-contract.test.mjs
Not-tested: Real external platform failures under production load
EOF
```

## Task 3: Add Bridge Incident Playbooks and IPC Handlers

**Files:**
- Create: `desktop/src/main/bridge/incident-playbooks.ts`
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/shared/bridge-ipc.ts`
- Create: `desktop/tests/bridge-incident-playbooks.test.mjs`
- Create: `desktop/tests/bridge-incident-ipc.test.mjs`

**Step 1: Write the failing tests**

Cover:

- `bridge_manager_down`
- `adapter_start_failure`
- `adapter_runtime_failure`
- `bridge_delivery_failure`

And IPC handlers:

- `bridge:diagnose`
- `bridge:list-incidents`
- `bridge:get-incident`
- `bridge:dismiss-incident`

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/bridge-incident-playbooks.test.mjs tests/bridge-incident-ipc.test.mjs
```

Expected: `FAIL`

**Step 3: Implement deterministic playbooks**

Build playbooks that:

- capture live bridge state
- collect relevant recent observations
- classify into the 4 first-version incident types
- assign severity and confidence deterministically
- generate stable `summary`, `user_visible_explanation`, and `recommended_actions`
- persist the incident record

Wire IPC handlers in `desktop/src/main/index.ts`.

**Step 4: Run tests to verify they pass**

Run the same command.

**Step 5: Commit**

```bash
git add desktop/src/main/bridge/incident-playbooks.ts desktop/src/main/index.ts desktop/src/shared/bridge-ipc.ts desktop/tests/bridge-incident-playbooks.test.mjs desktop/tests/bridge-incident-ipc.test.mjs
git commit -F - <<'EOF'
Diagnose bridge runtime failures through deterministic desktop playbooks

Constraint: Bridge self-heal depends on Electron-main-owned diagnosis because bridge lifecycle is not a backend concern
Rejected: Put diagnosis logic in the renderer | would duplicate runtime reasoning and break ownership boundaries
Confidence: high
Scope-risk: moderate
Directive: Keep first-version bridge playbooks limited to manager/adapter/delivery incidents until binding and permission evidence contracts are stronger
Tested: cd desktop && node --test tests/bridge-incident-playbooks.test.mjs tests/bridge-incident-ipc.test.mjs
Not-tested: Real operator-triggered diagnosis against live adapters
EOF
```

## Task 4: Add Confirm-Before-Run Bridge Recovery Actions

**Files:**
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/shared/bridge-ipc.ts`
- Create: `desktop/src/main/bridge/action-runner.ts`
- Create: `desktop/tests/bridge-run-action.test.mjs`

**Step 1: Write the failing tests**

Cover:

- `bridge:run-action`
- allowlisted actions only
- action result persisted into `executed_actions`
- unsupported action rejected

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/bridge-run-action.test.mjs
```

Expected: `FAIL`

**Step 3: Implement bounded action runner**

Allow only:

- `probe_platform`
- `restart_bridge_runtime`
- `start_weixin_login`

Every action must:

- require an existing incident id
- match a recommended action
- be persisted into `executed_actions`
- return a stable result payload

No automatic execution. Renderer must still confirm before invoking `bridge:run-action`.

**Step 4: Run tests to verify they pass**

Run the same command.

**Step 5: Commit**

```bash
git add desktop/src/main/bridge/action-runner.ts desktop/src/main/index.ts desktop/src/shared/bridge-ipc.ts desktop/tests/bridge-run-action.test.mjs
git commit -F - <<'EOF'
Run bounded bridge recovery actions through confirmed incident workflows

Constraint: Program 03D-B is suggestion-first, so bridge runtime actions must only run after explicit confirmation
Rejected: Let the renderer execute repair actions directly through raw bridge IPC calls | action allowlists and execution audit must stay in Electron main
Confidence: high
Scope-risk: moderate
Directive: Keep bridge run-action allowlists tight and persist every executed action back to its incident record
Tested: cd desktop && node --test tests/bridge-run-action.test.mjs
Not-tested: Real operator confirmation flows across every adapter type
EOF
```

## Task 5: Add a Minimal Bridge Self-Heal Panel to the Existing Bridge Page

**Files:**
- Modify: `frontend/src/core/bridge/client.ts`
- Modify: `frontend/src/components/workspace/bridge/BridgeSection.tsx`
- Create: `frontend/src/components/workspace/bridge/BridgeIncidentsPanel.tsx`
- Create: `frontend/src/components/workspace/bridge/bridge-incidents-panel.test.ts`

**Step 1: Write the failing UI/client tests**

Cover:

- new bridge client methods for diagnose/list/get/dismiss/run-action
- bridge page can trigger diagnosis
- bridge page can show recent incidents and suggested actions
- action buttons require confirmation

**Step 2: Run tests to verify they fail**

Use the repo’s existing frontend lightweight test style for bridge components.

**Step 3: Implement minimal workflow UI**

Do not build the full diagnostics center yet.

Instead add a compact panel in the existing bridge overview:

- “Diagnose bridge” button
- recent incidents summary
- selected incident explanation
- suggested actions with confirm UI

**Step 4: Run tests to verify they pass**

Run the relevant frontend tests and type checks.

**Step 5: Commit**

```bash
git add frontend/src/core/bridge/client.ts frontend/src/components/workspace/bridge/BridgeSection.tsx frontend/src/components/workspace/bridge/BridgeIncidentsPanel.tsx frontend/src/components/workspace/bridge/bridge-incidents-panel.test.ts
git commit -F - <<'EOF'
Add a bridge self-heal panel to the desktop bridge overview

Constraint: Self-heal workflow is higher priority than a full diagnostics center, so the first UI should live inside the existing bridge page
Rejected: Build a dedicated diagnostics center first | delays the actual diagnose-and-confirm workflow the user needs now
Confidence: high
Scope-risk: moderate
Directive: Keep the first bridge incident UI compact and workflow-oriented; leave richer browsing to the later diagnostics center
Tested: run the relevant frontend bridge tests and type checks
Not-tested: Manual desktop UX across all platforms
EOF
```

## Task 6: Add a Full Bridge Diagnostics Center and Documentation

**Files:**
- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Create: `frontend/src/components/workspace/bridge/BridgeDiagnosticsSection.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `README.md`
- Modify: `docs/desktop/development.md`
- Optional: bridge-specific docs if needed

**Step 1: Write the failing coverage/documentation tests**

Add or extend tests so docs and bridge UI contract explicitly mention:

- desktop bridge incident records
- suggestion-first bridge recovery workflow
- bridge diagnostics center as consumer of incident records
- implemented vs deferred bridge incident types

**Step 2: Run tests to verify they fail**

Run the relevant frontend/docs checks.

**Step 3: Implement diagnostics center**

Add a diagnostics section in `BridgeLayout` with:

- incident list
- incident detail
- action history

Make it consume the same bridge incident IPC surface, not its own diagnosis logic.

Also update docs to reflect shipped boundaries.

**Step 4: Run final verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop
node --test tests/bridge-*.mjs

cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm typecheck
# plus the relevant bridge-focused tests used by this repo
```

Also run any small backend sanity checks if bridge-facing thread permission behavior was touched.

**Step 5: Commit**

```bash
git add frontend/src/components/workspace/bridge/BridgeLayout.tsx frontend/src/components/workspace/bridge/BridgeDiagnosticsSection.tsx frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts README.md docs/desktop/development.md
git commit -F - <<'EOF'
Document and surface bridge incident history in the desktop diagnostics center

Constraint: Bridge diagnostics must consume the same Electron-main-owned incident records as the self-heal workflow
Rejected: Add a renderer-only diagnostics view that recomputes failures from raw runtime state | would create a second diagnosis brain and drift from the control plane
Confidence: high
Scope-risk: broad
Directive: Keep bridge diagnostics center read-oriented; action execution should still flow through confirmed run-action IPC
Tested: run bridge desktop tests, relevant frontend tests, and type checks
Not-tested: Full multi-platform manual diagnostics UX
EOF
```
