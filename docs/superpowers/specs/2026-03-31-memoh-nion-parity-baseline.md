# Memoh ↔ Nion Parity Baseline

## Scope

This baseline compares Memoh's memory and self-maintenance backbone against Nion's current state for the personal AI assistant strategy.

Parity vocabulary:

- `replicated`
- `partial`
- `not_started`
- `intentionally_not_replicated`

## Capability Matrix

| Capability | Memoh Evidence | Nion Current State | Parity Status | Notes |
|---|---|---|---|---|
| Memory Providers | `README.md` memory providers section; `cmd/agent/main.go` provider registry; `/memory-providers` in OpenAPI and SDK | `MemoryOSService.list_provider_families()` exposes `builtin / mem0 / openviking` | `partial` | Family metadata exists, but runtime/provider parity is incomplete |
| Built-in Provider Modes | README documents `off / sparse / dense`; built-in provider factory in `cmd/agent/main.go` | `MemoryOSService` exposes `off / sparse / dense` metadata | `partial` | Metadata exists; Memoh-style dense/sparse runtime behavior is not replicated |
| Mem0 Provider | README memory table; `cmd/agent/main.go` Mem0 factory; `/memory-providers` APIs | `mem0_provider.py` currently only exposes family shell | `not_started` | Metadata only; no real Mem0 runtime |
| OpenViking Provider | README memory table; `cmd/agent/main.go` OpenViking factory | Embedded/remote OpenViking provider exists under `memory_os/openviking_provider.py` | `partial` | Activation exists, but parity is narrower than Memoh backbone |
| Memory CRUD Surface | OpenAPI `/bots/{bot_id}/memory`, `/memory/{id}`; SDK `getBotsByBotIdMemory`, `postBotsByBotIdMemory`, delete endpoints | `/api/memory`, `/api/memory/facts/{fact_id}` exist | `partial` | Compatibility bridge exists; add/search/admin parity incomplete |
| Memory Search | OpenAPI `/bots/{bot_id}/memory/search`; SDK `postBotsByBotIdMemorySearch` | Current Nion memory page supports local search over retrieved payload + recall search | `partial` | No dedicated provider-backed memory search API surface |
| Memory Compact | OpenAPI `/bots/{bot_id}/memory/compact`; SDK `postBotsByBotIdMemoryCompact` | No compact API/service in Nion current runtime | `not_started` | Planned future milestone |
| Memory Rebuild | OpenAPI `/bots/{bot_id}/memory/rebuild`; SDK `postBotsByBotIdMemoryRebuild` | No memory rebuild API/service; only notebook reindex and provider round-trip pieces | `not_started` | Planned future milestone |
| Memory Status | OpenAPI `/bots/{bot_id}/memory/status`; SDK `getBotsByBotIdMemoryStatus` | `/api/memory/status` exists, but mostly legacy config+payload view | `partial` | Does not yet mirror Memoh runtime health/index/source counts |
| Memory Usage | OpenAPI `/bots/{bot_id}/memory/usage`; SDK `getBotsByBotIdMemoryUsage` | No memory usage API in Nion | `not_started` | Planned future milestone |
| Heartbeat Service | README "Automation" feature; `cmd/agent/main.go` starts `heartbeat.Service`; `internal/heartbeat/` package | `nion.heartbeat.service.HeartbeatService` now exists and daemon owns heartbeat status/tick path | `partial` | Minimal backbone exists, but Memoh-style trigger richness is not complete |
| Heartbeat Logs | OpenAPI `/bots/{bot_id}/heartbeat/logs`; SDK `getBotsByBotIdHeartbeatLogs` | Nion now exposes `/api/heartbeat/logs` with SQLite-backed log storage | `partial` | Log backbone exists, but parity is still narrower than Memoh |
| Always-On Continuity | README “always-on continuity” framing; heartbeat + memory engineering together | Nion daemon now has an explicit heartbeat backbone instead of relying only on AutoDream polling | `partial` | Continuity backbone is improving, but compaction/rebuild still missing |
| Reflective Maintenance | Memoh source suggests heartbeat/autonomous activity backbone; no standalone AutoDream concept in primary surface | Heartbeat now exists as the primary backbone, but reflective maintenance is still mostly represented by transitional AutoDream pieces | `partial` | Needs follow-up milestone integration |
| Provider Status | OpenAPI `/memory-providers/{id}/status`; SDK `getMemoryProvidersByIdStatus` | Memory OS provider family and binding state exist | `partial` | Detailed provider runtime status not yet mirrored |
| Knowledge Base / Notebook Separation | Memoh shell is bot memory-centric; notebook-as-second-brain is not its primary product model | Nion design explicitly separates Notebook as `Knowledge Base` | `replicated` | This is an intentional Nion adaptation, not a gap |
| Project Domain Separation | Not a primary Memoh shell distinction | Nion design reserves separate `Projects` domain | `replicated` | Intentional Nion adaptation |
| Multi-Bot Product Shell | README and architecture explicitly multi-bot | Nion personal-assistant strategy does not replicate this | `intentionally_not_replicated` | Out of scope by product decision |
| Multi-User / Multi-Identity Shell | README, AGENTS, architecture all emphasize multi-user boundaries | Nion personal-assistant strategy does not replicate this | `intentionally_not_replicated` | Out of scope by product decision |

## Replicate / Adapt / Do Not Replicate

### Replicate

- provider-driven memory runtime
- built-in / mem0 / openviking provider family
- heartbeat backbone
- memory compaction
- memory rebuild
- memory runtime status
- memory usage visibility
- always-on continuity

### Adapt

- reflective maintenance should be integrated into Nion self-maintenance rather than exposed with Memoh's exact terminology
- notebook should be treated as second brain, not bot memory
- future project memory should live in a separate project domain

### Do Not Replicate

- multi-bot shell
- multi-user shell
- cross-channel identity-sharing shell

## Strict Boundary Rules

- Notebook is not memory.
- Notebook may be indexed by OpenViking.
- Notebook content does not become memory by default.
- `AutoDream` is retired as a standalone concept.
- Reflective maintenance is absorbed into heartbeat-driven self-maintenance.

## M0 Exit Summary

### Already replicated or strategically aligned

- provider-family architecture
- runtime bridge away from `memory.json`
- OpenViking embedded/remote activation
- notebook/memory separation at design level

### Partial

- provider runtime parity
- memory CRUD/search admin surface
- always-on continuity
- reflective maintenance concepts

### Not started

- memory compaction
- memory rebuild
- memory usage
- complete Mem0 implementation

### Intentionally not replicated

- multi-bot shell
- multi-user shell
- cross-channel identity shell

### Next milestone to implement

- `M1 Heartbeat Backbone`
