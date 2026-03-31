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
| Memory Providers | `README.md` memory providers section; `cmd/agent/main.go` provider registry; `/memory-providers` in OpenAPI and SDK | `MemoryOSService.list_provider_families()` exposes `builtin / mem0 / openviking` with explicit capability matrices and runtime-enriched provider state | `partial` | Provider families and active bindings now expose richer capability/status/usage metadata, but Memoh-level admin breadth is still incomplete |
| Built-in Provider Modes | README documents `off / sparse / dense`; built-in provider factory in `cmd/agent/main.go` | `MemoryOSService` exposes `off / sparse / dense` metadata | `partial` | Metadata exists; Memoh-style dense/sparse runtime behavior is not replicated |
| Mem0 Provider | README memory table; `cmd/agent/main.go` Mem0 factory; `/memory-providers` APIs | `mem0_provider.py` now resolves to a local compatibility runtime provider with explicit degraded status and unsupported compact/rebuild responses | `partial` | No longer metadata-only; still not a native Mem0-backed compact/rebuild/search implementation |
| OpenViking Provider | README memory table; `cmd/agent/main.go` OpenViking factory | Embedded/remote OpenViking provider exists under `memory_os/openviking_provider.py` | `partial` | Activation exists, but parity is narrower than Memoh backbone |
| Memory CRUD Surface | OpenAPI `/bots/{bot_id}/memory`, `/memory/{id}`; SDK `getBotsByBotIdMemory`, `postBotsByBotIdMemory`, delete endpoints | `/api/memory`, `/api/memory/facts/{fact_id}` exist | `partial` | Compatibility bridge exists; add/search/admin parity incomplete |
| Memory Search | OpenAPI `/bots/{bot_id}/memory/search`; SDK `postBotsByBotIdMemorySearch` | Current Nion memory page supports local search over retrieved payload + recall search | `partial` | No dedicated provider-backed memory search API surface |
| Memory Compact | OpenAPI `/bots/{bot_id}/memory/compact`; SDK `postBotsByBotIdMemoryCompact` | Nion now exposes `/api/memory/compact` with compaction service, logs, and heartbeat integration hook | `partial` | Manual compaction is implemented; provider parity and richer policies remain |
| Memory Rebuild | OpenAPI `/bots/{bot_id}/memory/rebuild`; SDK `postBotsByBotIdMemoryRebuild` | Nion now exposes `/api/memory/rebuild` and `/api/memory/rebuild/logs` with a rebuild service and log store | `partial` | Rebuild backbone exists, but provider/runtime parity is still narrower than Memoh |
| Memory Status | OpenAPI `/bots/{bot_id}/memory/status`; SDK `getBotsByBotIdMemoryStatus` | `/api/memory/status` and Memory OS provider state now expose runtime mode, health, and status summaries for the active provider | `partial` | Status surface is richer, but still narrower than Memoh's deeper runtime/admin detail |
| Memory Usage | OpenAPI `/bots/{bot_id}/memory/usage`; SDK `getBotsByBotIdMemoryUsage` | Nion now exposes `/api/memory/usage` plus provider-state usage summaries with estimated structured-memory usage | `partial` | Usage visibility exists in both API and provider state, but provider-specific accounting remains thinner than Memoh |
| Heartbeat Service | README "Automation" feature; `cmd/agent/main.go` starts `heartbeat.Service`; `internal/heartbeat/` package | `nion.heartbeat.service.HeartbeatService` now exists and daemon owns heartbeat status/tick path | `partial` | Minimal backbone exists, but Memoh-style trigger richness is not complete |
| Heartbeat Logs | OpenAPI `/bots/{bot_id}/heartbeat/logs`; SDK `getBotsByBotIdHeartbeatLogs` | Nion now exposes `/api/heartbeat/logs` with SQLite-backed log storage | `partial` | Log backbone exists, but parity is still narrower than Memoh |
| Always-On Continuity | README “always-on continuity” framing; heartbeat + memory engineering together | Nion daemon now has an explicit heartbeat backbone instead of relying only on AutoDream polling | `partial` | Continuity backbone is improving, but compaction/rebuild still missing |
| Reflective Maintenance | Memoh source suggests heartbeat/autonomous activity backbone; no standalone AutoDream concept in primary surface | Nion now has a primary `self-maintenance` runtime surface driven by heartbeat, with legacy AutoDream kept only as a compatibility wrapper | `partial` | Primary model is in place; product IA extraction and richer proposal depth still follow |
| Provider Status | OpenAPI `/memory-providers/{id}/status`; SDK `getMemoryProvidersByIdStatus` | Memory OS provider family and binding state now include runtime mode, health, capabilities, status summary, and usage summary | `partial` | Major status visibility gap is closed, but Nion still lacks Memoh's dedicated per-provider status endpoint shape and deeper details |
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
- Product IA is split across `Knowledge Base / Memory / Self-Maintenance / Projects`.
- Self-Maintenance is no longer hidden inside settings as the primary home.
- OpenViking is a capability layer, not a top-level product category.

## M0 Exit Summary

### Already replicated or strategically aligned

- provider-family architecture
- runtime bridge away from `memory.json`
- OpenViking embedded/remote activation
- notebook/memory separation at product-surface level
- dedicated self-maintenance product surface
- dedicated projects product surface

### Partial

- provider runtime parity
- memory CRUD/search admin surface
- always-on continuity
- deeper reflective maintenance richness and provider parity
- memory rebuild parity depth

### Remaining parity gaps after M6

- Mem0 is now a compatibility runtime provider, but it still does not offer native Mem0-backed compaction, rebuild, or richer provider search/admin semantics
- provider capability and status metadata are exposed through list/state surfaces, but Nion still does not mirror Memoh's full per-provider endpoint depth
- memory usage/status visibility is materially improved, but accounting and operator detail remain thinner than Memoh's broader backbone
- provider-backed memory search and admin breadth are still partial across the overall Memory OS surface

### Intentionally not replicated

- multi-bot shell
- multi-user shell
- cross-channel identity shell

### Current milestone state

- `M1 Heartbeat Backbone` implemented
- `M2 Memory Compaction` implemented
- `M3 Memory Rebuild` implemented
- `M4 Reflective Self-Maintenance` now uses `self-maintenance` as the primary runtime concept and keeps `AutoDream` as legacy compatibility
- `M5 Memory Product Surface` splits the user-facing IA across `Knowledge Base / Memory / Self-Maintenance / Projects`
- `M6 Provider Parity Completion` closes the metadata-only Mem0 gap and expands provider capability/status/usage visibility across API and settings surfaces
- notebook is no longer presented inside memory
- self-maintenance is no longer hidden inside settings as the primary home
