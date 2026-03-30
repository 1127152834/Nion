# Memoh Reference Reading Log

## High-Level Product Sources

- `/Users/zhangtiancheng/Documents/项目/agent/Memoh/README.md`
- `/Users/zhangtiancheng/Documents/项目/agent/Memoh/README_CN.md`

## API Surface Sources

- `/Users/zhangtiancheng/Documents/项目/agent/Memoh/spec/swagger.yaml`
- `/Users/zhangtiancheng/Documents/项目/agent/Memoh/packages/sdk/src/types.gen.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/Memoh/packages/sdk/src/sdk.gen.ts`

## Runtime Source Sources

- `/Users/zhangtiancheng/Documents/项目/agent/Memoh/cmd/agent/main.go`
- `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/memory/`
- `/Users/zhangtiancheng/Documents/项目/agent/Memoh/internal/heartbeat/`

## Findings Log

### 1. High-Level Product Framing

- Memoh's README frames the product around `always-on continuity`, not around a single memory or dream feature.
- Memory is presented as a pluggable provider system, not as a single file or a narrow recall feature.
- Heartbeat is called out as a first-class autonomous capability alongside scheduled tasks.
- Memoh's outer shell is multi-bot and multi-user, but the backbone underneath is provider-driven memory plus autonomous maintenance.

### 2. Memory Provider Backbone

- `cmd/agent/main.go` registers three memory provider families:
  - Built-in
  - Mem0
  - OpenViking
- The registry is instantiated in runtime startup and bootstrapped on service start.
- Memoh treats provider bootstrap as part of system initialization rather than an optional settings-only feature.

### 3. Heartbeat Backbone

- `cmd/agent/main.go` explicitly starts heartbeat via `startHeartbeatService(...)`.
- `internal/heartbeat/` exists as a dedicated runtime package.
- Swagger exposes `/bots/{bot_id}/heartbeat/logs`, confirming heartbeat is not just an internal timer but a surfaced operational system with logs.

### 4. Memory API Surface Evidence

- Swagger and generated SDK expose:
  - `GET /bots/{bot_id}/memory`
  - `POST /bots/{bot_id}/memory`
  - `DELETE /bots/{bot_id}/memory`
  - `DELETE /bots/{bot_id}/memory/{id}`
  - `POST /bots/{bot_id}/memory/search`
  - `POST /bots/{bot_id}/memory/compact`
  - `POST /bots/{bot_id}/memory/rebuild`
  - `GET /bots/{bot_id}/memory/status`
  - `GET /bots/{bot_id}/memory/usage`

### 5. Interpretation Of Memoh's Backbone

- Memoh's mature memory system is not just provider switching.
- It combines:
  - provider registry
  - heartbeat
  - compaction
  - rebuild
  - runtime status
  - memory usage
- This supports the strategic decision that Nion should replicate this backbone first, then integrate reflective maintenance/self-upgrade on top.

### 6. Relevance To Nion

- Nion should replicate Memoh's backbone, not its multi-bot shell.
- Nion's notebook/second-brain model remains distinct from memory.
- Memoh source evidence confirms that `heartbeat + memory maintenance + provider runtime` is the correct primary skeleton for Nion's next phase.
