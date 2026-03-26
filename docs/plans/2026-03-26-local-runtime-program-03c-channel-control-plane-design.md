# Local Runtime Program 03C: Channel Control Plane Design

## Goal

Extend the daemon control plane so Nion can inspect and operate IM channels from the same daemon-owned self-operations surface that already covers runtime, logs, diagnostics, delegated tasks, skills, and config.

After this phase, Nion should be able to answer questions like:

- Is the channel service running inside the local daemon?
- Which channel is currently down?
- Did Feishu fail to start, or did outbound delivery fail later?
- Are there pending pairing requests waiting for approval?
- Which users are currently authorized on Telegram?
- Can the system restart Slack or approve a pairing request without leaving the control plane?

The product goal is still not a user-facing TUI. The goal is a coherent daemon-owned operational substrate for both agents and human operators.

## Product Decision

Program 03C should unify channel observability and control actions under:

- `/api/daemon/channels/*`

This is the official control-plane surface.

Existing gateway routes under:

- `/api/channels/*`

should remain in place as UI compatibility surfaces for now, but they are no longer the architectural center of gravity for self-operations.

This phase should include both:

- **observability**
  channel lifecycle events, message-bus events, diagnostics, readable status
- **runtime control actions**
  restart, pairing code issuance, pair-request approval/rejection, authorized-user revocation

This phase should explicitly exclude:

- channel credential editing
- channel config persistence
- session override mutation

Those remain config-center or UI-adjacent concerns rather than daemon runtime control concerns.

## Critical Runtime Decision

Today the gateway app starts `ChannelService` during its own lifespan, but the desktop daemon app does not.

That means channel control-plane routes cannot be first-class in Electron until the daemon app also owns channel-service startup and shutdown.

So Program 03C must make one architectural shift:

- **the daemon app must start and stop `ChannelService` during daemon lifespan**

`start_channel_service()` is already singleton-based, so this can remain safe across process-local call sites.

This is the key difference between “channel routes exist somewhere in the codebase” and “the desktop daemon actually owns channel self-operations”.

## Scope

### In Scope

- start/stop `ChannelService` from daemon lifespan
- channel lifecycle event logging
- message-bus inbound/outbound event logging
- channel diagnostics snapshots
- daemon channel read APIs
- daemon channel control actions
- agent-facing control-plane tools for channel inspection and approved actions
- documentation and regression coverage for channel control-plane guarantees

### Out of Scope

- channel config / credential editing
- channel session override editing
- channel message transcript archival beyond bounded event metadata
- new Electron UI pages for channel diagnostics
- channel auto-remediation or restart policies

## Event Model

Program 03C should reuse the existing telemetry store and event schema. Do not create a separate channel database or a second event log.

Recommended category:

- `category = "channel"`

Recommended actor usage:

- `actor = "system"` for service-level and operator-action events
- `actor = "<channel_name>"` for per-channel lifecycle and message-flow events

This avoids a schema migration while still making channel attribution readable.

Structured details should carry the richer context:

- `channel_name`
- `chat_id`
- `request_id`
- `user_id`
- `authorized_user_id`
- `status`
- `queue_size`
- `listener_count`
- `error`
- `delivery_path`
- `text_length`

## Event Coverage

### Channel Service / Runtime Events

- `channel_service_started`
- `channel_service_stopped`
- `channel_disabled_skipped`
- `channel_started`
- `channel_start_failed`
- `channel_stopped`
- `channel_stop_failed`
- `channel_restart_requested`
- `channel_restart_completed`
- `channel_restart_failed`

### Message Bus Events

- `channel_inbound_enqueued`
- `channel_outbound_dispatched`
- `channel_outbound_failed`

These events should remain bounded. Do not store full message bodies. Use short summaries and lengths/counts instead.

### Operator Action Events

- `channel_pairing_code_issued`
- `channel_pair_request_approved`
- `channel_pair_request_rejected`
- `channel_authorized_user_revoked`

These are runtime control-plane actions and should be logged as first-class facts.

## Diagnostics Model

Program 03C should add:

- `scope_type = "channel"`
- `scope_id = <channel_name>`

Channel snapshots should summarize the latest known channel state, for example:

- `Channel 'feishu' is running`
- `Channel 'slack' failed to start`
- `Channel 'telegram' is running with recent outbound failure`

Snapshot details should stay human-readable and bounded:

- `channel_name`
- `running`
- `last_heartbeat`
- `last_error`
- `authorized_user_count`
- `pending_pair_request_count`
- `last_operator_action`
- `last_event_type`

For aggregate status, `GET /api/daemon/channels` should return a service-level summary from `ChannelService.get_status()` rather than requiring a new snapshot type.

## Daemon API Surface

Program 03C should introduce these daemon-owned routes:

### Read APIs

- `GET /api/daemon/channels`
  aggregated channel service status
- `GET /api/daemon/channels/{name}`
  one channel diagnostic summary
- `GET /api/daemon/channels/{platform}/pair-requests`
  pending/approved/rejected pair requests
- `GET /api/daemon/channels/{platform}/authorized-users`
  authorized users

### Control APIs

- `POST /api/daemon/channels/{name}/restart`
- `POST /api/daemon/channels/{platform}/pairing-code`
- `POST /api/daemon/channels/{platform}/pair-requests/{request_id}/approve`
- `POST /api/daemon/channels/{platform}/pair-requests/{request_id}/reject`
- `POST /api/daemon/channels/{platform}/authorized-users/{user_id}/revoke`

These routes should use the same runtime service and repository objects that the gateway routes already depend on, not shell commands or duplicated persistence logic.

## Agent Tool Surface

Program 03C should expose a minimal but sufficient channel self-operations toolkit:

- `get_channels_status()`
- `get_channel_diagnostics(channel_name)`
- `list_channel_pair_requests(platform, status=None)`
- `list_channel_authorized_users(platform, active_only=True)`
- `restart_channel_control_plane(channel_name)`
- `issue_channel_pairing_code(platform, ttl_minutes=10)`
- `approve_channel_pair_request(platform, request_id, workspace_id=None, note=None)`
- `reject_channel_pair_request(platform, request_id, note=None)`
- `revoke_channel_authorized_user(platform, user_id)`

This gives the agent enough power to explain channel state and perform bounded runtime actions without crossing into credential/config mutation.

## Interaction with Existing Gateway Routes

`/api/channels/*` should remain available for the current frontend and operator UI.

But Program 03C should not try to fully refactor those routes into wrappers in the same change set. That would increase scope and mix transport migration with control-plane delivery.

Instead:

- daemon routes become the authoritative self-operations surface
- gateway routes remain compatibility/UI routes
- both may share the same underlying service/repository logic

## Testing Strategy

Program 03C should be proven by backend tests, not by Electron UI first.

Required evidence:

- daemon app starts channel service in its lifespan
- channel service/message bus emit structured telemetry into SQLite
- channel snapshots are updated
- daemon channel read APIs return expected status and diagnostics
- daemon channel control actions work and log operator events
- agent-facing tools can inspect and invoke the approved actions

The first version should prioritize correctness and observability, not UI exposure.
