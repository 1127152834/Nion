# Hermes Channel Ops Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Hermes-style channel operations features such as runtime status, capability modeling, pairing approval, and operator diagnostics on top of Nion's existing channel runtime.

**Architecture:** Keep `ChannelManager`, `ChannelService`, and the concrete channel drivers as the execution path. Add an observational runtime-state layer, a pairing/authorization repository, and richer gateway endpoints; then build a dedicated management route that surfaces channel health, capability flags, authorized users, pending approvals, and restart actions without replacing the current runtime core.

**Tech Stack:** FastAPI, SQLite/JSON persistence, current channel runtime, React, TanStack Query

---

## ADR: Ownership And Boundaries

- `ChannelService` is the outward-facing status aggregator and the owner of channel restart lifecycle.
- `ChannelManager` remains the runtime dispatcher. It emits runtime events in Stage 2A and consumes pairing gates in Stage 2B.
- `ChannelRuntimeState` is observational only. It does not write config, it does not write thread mappings, and it does not replace `ChannelService` or `ChannelStore`.
- `ChannelStore` continues to own chat/topic to thread mapping only. Do not fold pairing or governance state into it.
- Pairing state is scoped to `channel_name + chat_id + user_id`.
- `topic_id` only scopes thread reuse within a chat. It does not change the authorization subject.
- In group chats, authorization is per user within a chat, not whole-chat authorization.

## Exact `/api/channels` Contract

Stage 2A must lock the contract below before building the UI:

```ts
type ChannelOpsResponse = {
  service_running: boolean;
  pending_pair_requests: number;
  channels: Record<string, ChannelOpsItem>;
};

type ChannelOpsItem = {
  enabled: boolean;
  running: boolean;
  capabilities: {
    supports_streaming: boolean;
  };
  last_heartbeat: number | null;
  last_error: string | null;
  authorized_user_count: number;
  pending_pair_request_count: number;
  can_restart: boolean;
};
```

The service-down case must still return the same shape:

```json
{
  "service_running": false,
  "pending_pair_requests": 0,
  "channels": {}
}
```

## UI Reachability Decision

- Use a standalone route: `/workspace/manage/channels`
- Add explicit entry points from:
  - `frontend/src/components/workspace/workspace-nav-menu.tsx`
  - `frontend/src/components/workspace/command-palette.tsx`
- Do not embed channel ops into `frontend/src/components/workspace/settings/settings-dialog.tsx` in this lane.

## Command Policy Matrix

| Command | Bypass Pairing | Reason |
| --- | --- | --- |
| `/help` | Yes | Static help only; does not invoke runtime or expose operational state |
| `/bootstrap` | No | Converts into chat flow and enters runtime |
| `/new` | No | Creates or switches thread state |
| `/status` | No | Exposes thread status and operator context |
| `/models` | No | Exposes system capability surface |
| `/memory` | No | Exposes system state summary |

Unauthorized commands and chat messages must return a pairing-required notice and must not enter `_handle_chat()` or create a new thread.

---

**Execution Notes**

- Use `@test-driven-development` and `@verification-before-completion`.
- Do not replace `ChannelStore`; extend around it.
- This lane owns channel operator surfaces and can run in parallel with recall, insights, and tool-policy work as long as it avoids shared settings shell files.
- Stage 2A must remain read-mostly and must not change current message dispatch behavior.
- Stage 2B may add enforcement, but authorized traffic must still use the existing runtime path.

## Stage 2A: Runtime Observability And Operator Route

### Task 1: hermes-channel-ops-4-runtime-observability

**Files:**
- Create: `backend/app/channels/runtime_state.py`
- Modify: `backend/app/channels/service.py`
- Modify: `backend/app/channels/manager.py`
- Modify: `backend/app/gateway/routers/channels.py`
- Test: `backend/tests/test_channel_runtime_status.py`
- Test: `backend/tests/test_channels_router_ops.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_channel_runtime_status.py`:

```python
from app.channels.runtime_state import ChannelRuntimeState


def test_runtime_state_is_observational_and_tracks_heartbeat_and_errors():
    state = ChannelRuntimeState()
    state.mark_started("telegram", {"supports_streaming": False})
    state.mark_error("telegram", "bot token rejected")

    snapshot = state.snapshot()["channels"]["telegram"]

    assert snapshot["running"] is True
    assert snapshot["capabilities"]["supports_streaming"] is False
    assert snapshot["last_heartbeat"] is not None
    assert snapshot["last_error"] == "bot token rejected"
```

Create `backend/tests/test_channels_router_ops.py`:

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app


def test_channels_status_returns_full_ops_contract_when_service_is_down():
    client = TestClient(create_app())

    response = client.get("/api/channels")

    assert response.status_code == 200
    assert response.json() == {
        "service_running": False,
        "pending_pair_requests": 0,
        "channels": {},
    }
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_channel_runtime_status.py tests/test_channels_router_ops.py -q
```

Expected:

- `test_channel_runtime_status.py` fails because `app.channels.runtime_state` does not exist.
- `test_channels_router_ops.py` fails because `/api/channels` does not yet include `pending_pair_requests`.

**Step 3: Write minimal implementation**

Implement `backend/app/channels/runtime_state.py` as an observational collaborator. It should:

- store per-channel `running`, `capabilities`, `last_heartbeat`, and `last_error`
- expose a snapshot shaped for `ChannelService.get_status()`
- avoid writing configuration or thread mappings

Thread the ownership model through the existing services:

- `ChannelManager` emits runtime events such as started, heartbeat, stopped, and error
- `ChannelService` aggregates `_running`, enabled flags, runtime-state snapshots, and restart capability into the outward-facing status response
- `backend/app/gateway/routers/channels.py` returns the exact Stage 2A contract

The minimum service-down response must be:

```python
{
    "service_running": False,
    "pending_pair_requests": 0,
    "channels": {},
}
```

Per-channel responses must include:

```python
{
    "enabled": True,
    "running": True,
    "capabilities": {"supports_streaming": False},
    "last_heartbeat": 1710000000.0,
    "last_error": None,
    "authorized_user_count": 0,
    "pending_pair_request_count": 0,
    "can_restart": True,
}
```

**Step 4: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_channel_runtime_status.py tests/test_channels_router_ops.py -q
```

Expected: all tests pass

**Step 5: Commit**

```bash
git add backend/app/channels/runtime_state.py backend/app/channels/service.py backend/app/channels/manager.py backend/app/gateway/routers/channels.py backend/tests/test_channel_runtime_status.py backend/tests/test_channels_router_ops.py
git commit -F - <<'EOF'
Expose channel runtime health as an observational operator contract

Make channel status a deliberate API contract while preserving ChannelService
and ChannelManager as the only execution path owners.

Constraint: Runtime state must remain observational and must not replace config or thread mapping ownership
Rejected: Replace ChannelService with a separate daemon | adds churn before governance boundaries are stable
Confidence: high
Scope-risk: moderate
Directive: Do not let ChannelRuntimeState become a second source of truth for config or routing
Tested: uv run pytest tests/test_channel_runtime_status.py tests/test_channels_router_ops.py -q
Not-tested: multi-process heartbeat reconciliation
EOF
```

### Task 2: hermes-channel-ops-4-operator-route

**Files:**
- Create: `frontend/src/core/channels/types.ts`
- Create: `frontend/src/core/channels/api.ts`
- Create: `frontend/src/core/channels/hooks.ts`
- Create: `frontend/src/app/workspace/manage/channels/page.tsx`
- Create: `frontend/src/components/workspace/channels/channel-ops-page.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`

**Step 1: Implement against the locked contract**

Mirror the backend contract in `frontend/src/core/channels/types.ts` and load it through TanStack Query, following the existing `frontend/src/core/memory/api.ts` and `frontend/src/core/memory/hooks.ts` pattern.

Use `frontend/src/app/workspace/manage/channels/page.tsx` as the standalone entry route and `frontend/src/components/workspace/channels/channel-ops-page.tsx` as the page body component.

Add explicit navigation entry points from:

- `frontend/src/components/workspace/workspace-nav-menu.tsx`
- `frontend/src/components/workspace/command-palette.tsx`

Do not wire this into `settings-dialog.tsx`.

**Step 2: Render the Stage 2A states**

The page must handle:

- loading
- error
- service down
- data loaded

The loaded state must render:

- runtime health
- capabilities
- `last_heartbeat`
- `last_error`
- `authorized_user_count`
- `pending_pair_request_count`
- restart actions

**Step 3: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Expected: `eslint` and `tsc --noEmit` both succeed

**Step 4: Commit**

```bash
git add frontend/src/core/channels/types.ts frontend/src/core/channels/api.ts frontend/src/core/channels/hooks.ts frontend/src/app/workspace/manage/channels/page.tsx frontend/src/components/workspace/channels/channel-ops-page.tsx frontend/src/components/workspace/workspace-nav-menu.tsx frontend/src/components/workspace/command-palette.tsx frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/types.ts
git commit -F - <<'EOF'
Add a reachable standalone operator route for channel runtime status

Ship the channel ops surface as a dedicated route with explicit navigation
entry points instead of hiding it behind the shared settings shell.

Constraint: This lane must stay merge-friendly with the other Hermes plans
Rejected: Embed channel ops inside the current settings dialog | increases shell conflict risk and hides the route
Confidence: medium
Scope-risk: moderate
Directive: Keep Stage 2A read-mostly; do not introduce pairing enforcement through the UI
Tested: pnpm check
Not-tested: manual mobile polish and connector-specific UX nuances
EOF
```

### Stage 2A Acceptance Criteria

- `/api/channels` returns the exact contract in both service-up and service-down states.
- `/workspace/manage/channels` is reachable from nav menu and command palette.
- The UI covers loading, error, service-down, and data-loaded states.
- The UI displays real `enabled`, `running`, `capabilities`, `last_error`, `last_heartbeat`, `pending_pair_request_count`, and `authorized_user_count` values.
- Restart action results are reflected in subsequent status reads.
- No pairing enforcement is introduced yet; current message dispatch behavior remains unchanged.

## Stage 2B: Pairing Governance And Runtime Enforcement

### Task 3: hermes-channel-ops-4-pairing-governance

**Files:**
- Create: `backend/app/channels/pairing_repository.py`
- Create: `backend/app/channels/pairing_service.py`
- Modify: `backend/app/channels/manager.py`
- Modify: `backend/app/gateway/routers/channels.py`
- Test: `backend/tests/test_channel_pairing.py`

**Step 1: Write the failing tests**

Create `backend/tests/test_channel_pairing.py`:

```python
from app.channels.pairing_service import PairingService


def test_pair_request_must_be_approved_before_user_is_authorized(tmp_path):
    service = PairingService(base_dir=tmp_path)
    request = service.create_request(
        channel_name="telegram",
        chat_id="chat-1",
        user_id="u-1",
    )

    assert service.is_authorized("telegram", "chat-1", "u-1") is False

    service.approve(request.request_id)

    assert service.is_authorized("telegram", "chat-1", "u-1") is True
```

Extend the same test file with authorization-matrix coverage:

- unauthorized chat does not enter runtime
- authorized chat still uses the current runtime path
- group chat authorization is per user within a chat
- `topic_id` reuses thread scope but does not change the authorization subject
- `/help` bypasses pairing
- `/bootstrap`, `/new`, `/status`, `/models`, and `/memory` do not bypass pairing

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_channel_pairing.py -q
```

Expected: failures because `PairingService` and the authorization gate do not yet exist

**Step 3: Write minimal implementation**

Implement a pairing repository and service that persist:

- pair requests
- approvals
- revocations
- counts needed by `/api/channels`

Key rules:

- authorization key is `channel_name + chat_id + user_id`
- `topic_id` is ignored for authorization and only affects thread reuse
- unauthorized chat messages and non-bypassed commands return a pairing-required notice
- unauthorized inputs do not enter `_handle_chat()`
- unauthorized inputs do not create new threads
- authorized inputs still follow the existing runtime path

Update `/api/channels` so it reports real:

- `pending_pair_requests`
- `authorized_user_count`
- `pending_pair_request_count`

**Step 4: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_channel_runtime_status.py tests/test_channels_router_ops.py tests/test_channel_pairing.py -q
```

Expected: all tests pass

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Expected: `eslint` and `tsc --noEmit` both succeed

**Step 5: Commit**

```bash
git add backend/app/channels/pairing_repository.py backend/app/channels/pairing_service.py backend/app/channels/manager.py backend/app/gateway/routers/channels.py backend/tests/test_channel_pairing.py
git commit -F - <<'EOF'
Add explicit pairing governance before channel users can invoke runtime

Require channel authorization at the per-user-per-chat boundary so runtime
entry is governed without changing existing thread reuse behavior.

Constraint: Authorization must preserve the current runtime path for approved traffic
Rejected: Store pairing state in ChannelStore | couples governance to thread mapping ownership
Confidence: medium
Scope-risk: moderate
Directive: Keep authorization keyed by channel plus chat plus user; do not let topic_id redefine the authorization subject
Tested: uv run pytest tests/test_channel_runtime_status.py tests/test_channels_router_ops.py tests/test_channel_pairing.py -q; pnpm check
Not-tested: concurrent approvals and revocations under high write contention
EOF
```

### Stage 2B Acceptance Criteria

- Pairing repository persists request, approve, and revoke state by `channel_name + chat_id + user_id`.
- `topic_id` only affects thread reuse and does not change authorization subject.
- Unauthorized normal chat does not enter runtime.
- Authorized normal chat still uses the current runtime path.
- Group chat, multi-user same-chat, and topic-thread authorization tests all exist.
- Command policy matrix is enforced exactly as written above.
- `/api/channels` reflects real `pending_pair_requests`, `authorized_user_count`, and `pending_pair_request_count` values.

## Final Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_channel_runtime_status.py tests/test_channels_router_ops.py tests/test_channel_pairing.py -q
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

## Manual Acceptance

- Existing channel delivery still works for already-approved traffic.
- `/workspace/manage/channels` shows real runtime state, not hardcoded placeholders.
- `/workspace/manage/channels` is reachable from the nav menu and command palette.
- Unauthorized users cannot silently invoke the runtime after Stage 2B is enabled.
- Unauthorized non-bypassed commands do not create threads.
- This lane does not edit recall or surface-policy files.
