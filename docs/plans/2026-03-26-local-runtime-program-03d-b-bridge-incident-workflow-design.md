# Local Runtime Program 03D-B: Desktop Bridge Incident Workflow Design

## Goal

Build a desktop-owned bridge incident workflow that can diagnose bridge runtime problems, persist structured bridge incident records, suggest bounded recovery actions, and later power a dedicated diagnostics center in the desktop UI.

This phase is explicitly about the **desktop bridge runtime** now living under:

- `desktop/src/main/bridge/*`

It is **not** about the legacy backend `app/channels/*` subsystem. That model is obsolete on the current `electron` line and must not shape the new design.

## Product Decision

Program 03D-B should design two related surfaces:

1. **Bridge self-heal workflow**
   The higher-priority feature. Users should be able to explicitly diagnose bridge issues and receive bounded, confirm-before-execute recovery actions.

2. **Bridge diagnostics center**
   A lower-priority but important UI consumer of the same incident records. It should show recent incidents, evidence, status, and suggested actions without re-running diagnosis logic client-side.

Implementation priority:

- build the self-heal workflow first
- build the diagnostics center second

## Real Control Plane Boundary

The bridge runtime is owned by **Electron main**, not backend daemon.

### Owner

- `desktop/src/main/bridge/bridge-manager.ts`

### Transport

- `desktop/src/shared/bridge-ipc.ts`
- preload bridge API exposed on `window.nionDesktop.bridge`

### Current consumers

- `frontend/src/core/bridge/client.ts`
- `frontend/src/components/workspace/bridge/*`

### Downstream dependency

The backend daemon is only a downstream service from the bridge runtime’s perspective, used through `nion-thread-client.ts`. The daemon does not own bridge lifecycle, bridge status, or bridge action execution.

This means:

- bridge incidents should be diagnosed in Electron main
- bridge incident actions should be executed in Electron main
- renderer/UI should consume bridge incident records over IPC

## Storage Strategy

Program 03D-B should not force bridge incidents into backend SQLite.

Instead:

- daemon incidents remain in backend SQLite
- bridge incidents live in a desktop-owned bridge store under user data

Use the same high-level incident shape, but allow a different storage implementation.

### Recommended first implementation

Keep bridge incident persistence aligned with the existing desktop bridge stores:

- `bridge/settings.json`
- `bridge/bindings.json`
- `bridge/offsets.json`
- `bridge/weixin.json`

So add:

- `bridge/incidents.json`

This is enough for first-version incident history and filtering. If incident volume grows later, the desktop bridge store can migrate to SQLite without changing the external incident contract.

## Incident Record Shape

Bridge incidents should use a structured record compatible in spirit with Program 03D-A:

- `incident_id`
- `created_at`
- `updated_at`
- `source`
  - `bridge_page`
  - `automatic` reserved
  - `chat` reserved for later
- `incident_type`
- `severity`
  - `info`
  - `warning`
  - `error`
- `status`
  - `open`
  - `resolved`
  - `dismissed`
- `adapter_platform`
- `binding_id`
- `thread_id`
- `summary`
- `user_visible_explanation`
- `root_cause_hypothesis`
- `confidence`
- `recommended_actions`
- `executed_actions`
- `evidence`
- `resolution_note`

The store should preserve the diagnosis result, not replace lower-level observations.

## Bridge Runtime Observations

To diagnose bridge failures reliably, bridge runtime needs a small structured observation layer, similar in spirit to daemon event logs but simpler.

### Recommended observation categories

- bridge manager lifecycle
- adapter lifecycle
- probe results
- binding resolution outcomes
- permission workflow states
- delivery / reply loop failures

### Recommended observation examples

- `bridge_manager_started`
- `bridge_manager_stopped`
- `bridge_manager_start_failed`
- `adapter_start_failed`
- `adapter_runtime_error`
- `adapter_probe_failed`
- `binding_resolved`
- `binding_resolution_failed`
- `permission_request_emitted`
- `permission_request_resolved`
- `permission_request_timed_out`
- `bridge_delivery_failed`

The first version can store recent observations in a bounded JSON file or ring buffer rather than inventing a full logging subsystem.

## First-Version Incident Types

### Implement first

1. `bridge_manager_down`
   The bridge manager is not running, or no enabled adapter could enter a running state.

2. `adapter_start_failure`
   A configured adapter fails to start or validate into an operable state.

3. `adapter_runtime_failure`
   An adapter started previously but later reports runtime errors or disconnected state.

4. `bridge_delivery_failure`
   A bridge message enters runtime processing but delivery, reply loop, or finalization fails.

### Design now, defer implementation

5. `binding_resolution_error`
   Binding lookup or routing is incorrect or stale.

6. `permission_workflow_stuck`
   Permission flow is emitted but never resolved or retried successfully.

## Playbook Layers

Every bridge diagnosis should follow a stable playbook:

1. **Target Resolution**
   Determine whether the request targets:
   - whole bridge runtime
   - specific adapter platform
   - specific binding
   - specific thread route

2. **State Capture**
   Collect:
   - `bridgeManager.getStatus()`
   - bridge settings snapshot
   - bindings snapshot
   - Weixin accounts snapshot
   - probe result if needed
   - recent bridge observations

3. **Failure Classification**
   Use deterministic rules to classify into one of the implemented incident types.

4. **Explanation Synthesis**
   Produce:
   - `summary`
   - `user_visible_explanation`
   - `root_cause_hypothesis`
   - `confidence`

5. **Suggested Action Generation**
   Produce bounded recovery actions, but do not execute automatically.

6. **Record Persistence**
   Persist the incident before returning it to the caller.

## Suggested Action Model

Bridge recommended actions should be more constrained than daemon actions because the bridge touches external platforms directly.

Each action should contain:

- `action_id`
- `action_type`
- `label`
- `reason`
- `risk_level`
- `requires_confirmation`
- `executable_now`
- `scope`
  - `global`
  - `adapter`
  - `binding`
- `platform`
- `binding_id`
- `ipc_channel`
- `ipc_args`
- `expected_outcome`

### First-version executable actions

1. `probe_platform`
   Uses `bridge:probe`

2. `restart_bridge_runtime`
   Executes a bounded `bridge:stop` then `bridge:start`

3. `start_weixin_login`
   Uses `bridge:start-weixin-login`
   Only for Weixin auth-specific startup failures

### First-version advisory-only actions

- review bindings
- review incident evidence
- inspect recent observations
- review Weixin accounts
- retry later after external dependency recovers

### Execution policy

Program 03D-B first version is **suggestion-first**:

- diagnosis may suggest actions
- user must confirm before execution
- no automatic self-heal for first version

## IPC Contract

Program 03D-B should add a dedicated incident layer on top of existing bridge IPC:

- `bridge:list-incidents`
- `bridge:get-incident`
- `bridge:diagnose`
- `bridge:dismiss-incident`
- `bridge:run-action`

### Why `bridge:run-action`

Even in a suggestion-first model, once the user confirms an action, execution and audit should happen in Electron main, not in the renderer.

This ensures:

- action allowlist is enforced in one place
- `executed_actions` can be written atomically back to the incident record
- renderer remains a control-plane consumer, not the runtime owner

## Bridge Self-Heal Workflow

### First implementation surface

Use the existing bridge page as the initial trigger surface, not chat.

Reason:

- bridge runtime is desktop-owned
- current bridge controls already live in the bridge page
- backend/agent chat does not own bridge IPC

### Workflow

1. user clicks “Diagnose”
2. renderer calls `bridge:diagnose`
3. Electron main resolves incident and stores it
4. renderer shows explanation + suggested actions
5. user explicitly confirms one action
6. renderer calls `bridge:run-action`
7. Electron main executes allowed action and updates incident

### Chat support

Design for later, but do not implement in v1. A future chat-driven bridge diagnosis will need a desktop-mediated bridge tool layer, not direct backend access.

## Diagnostics Center

### Relationship to existing bridge page

The existing bridge page should host the first workflow trigger.

The later diagnostics center should become the historical and investigative surface, not the place where bridge runtime controls originally live.

### Recommended first UI model

- `Diagnostics` section inside `BridgeLayout`
- incident list
- incident detail panel
- recommended action panel

It should read from:

- `bridge:list-incidents`
- `bridge:get-incident`

It should trigger:

- `bridge:diagnose`
- `bridge:dismiss-incident`
- `bridge:run-action`

The diagnostics center should never recompute diagnosis in the renderer.

## Testing Strategy

The first implementation should prove:

- bridge incident store persistence and filtering
- bridge diagnosis IPC contract
- deterministic classification for the first 4 incident types
- allowlisted action execution through `bridge:run-action`
- renderer bridge client wiring
- bridge page workflow trigger

Use existing `desktop/tests/*.mjs` contract style and current bridge UI tests as the base pattern.

## Explicit Non-Goals

- do not reuse the removed backend `app/channels/*` subsystem
- do not auto-execute recovery actions
- do not implement backend/daemon bridge incidents in this phase
- do not build a second diagnostics logic in the frontend
- do not fold bridge incidents into backend `incident_records` yet
