# Channel Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `Nion-Agent`-style channel control-plane features without replacing the current repo's channel connection drivers or chat runtime.

**Architecture:** Keep `ChannelManager`, `service.py`, `feishu.py`, `slack.py`, and `telegram.py` as the primary execution path. Layer in typed config, pairing, authorization, session override, runtime health, message logs, webhook/stream mode, and operator observability around that existing runtime.

**Tech Stack:** FastAPI, SQLite, current channel runtime, React, TanStack Query

---

**Dependency:** Module 08 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 10.

### Task 1: Add Channel Data Model

**Files:**
- Create: `backend/app/channels/db.py`
- Create: `backend/app/channels/repository.py`
- Create: `backend/app/channels/webhook_service.py`
- Modify: `backend/packages/harness/deerflow/config/app_config.py`
- Create: `backend/packages/harness/deerflow/config/channels_config.py`
- Test: `backend/tests/test_channel_repository.py`

### Task 2: Add Supplemental Runtime Features

**Files:**
- Create: `backend/app/channels/runtime_manager.py`
- Create: `backend/app/channels/incoming_service.py`
- Create: `backend/app/channels/connection_service.py`
- Modify: `backend/app/channels/manager.py`
- Modify: `backend/app/channels/service.py`
- Modify: `backend/app/channels/feishu.py`
- Modify: `backend/app/channels/slack.py`
- Modify: `backend/app/channels/telegram.py`
- Test: `backend/tests/test_channel_runtime_manager.py`

Steps:

1. Add runtime state tracking and logging around the current runtime.
2. Preserve slash commands and Slack support.
3. Add webhook/stream mode support where the current connector can absorb it safely.

### Task 3: Add Channel Gateway APIs

**Files:**
- Modify: `backend/app/gateway/routers/channels.py`
- Modify: `backend/app/gateway/app.py`
- Test: `backend/tests/test_channels_api.py`

Cover:

- config CRUD
- connection tests
- pairing code lifecycle
- pair request approval/rejection
- authorized users
- session override update
- runtime status
- SSE operator events if shipped in this pass

### Task 4: Port Channel Control UI

**Files:**
- Create: `frontend/src/core/channels/api.ts`
- Create: `frontend/src/core/channels/hooks.ts`
- Create: `frontend/src/core/channels/types.ts`
- Create: `frontend/src/core/channels/index.ts`
- Create: `frontend/src/components/workspace/settings/channel-settings-page.tsx`
- Create: `frontend/src/app/workspace/manage/channels/page.tsx`

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_channel_repository.py tests/test_channel_runtime_manager.py tests/test_channels_api.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Existing channel chat flow still works.
- Slash commands still work if enabled.
- Channel credentials can be configured from UI.
- Pairing / authorization / session override work.
- Runtime status and message-log style operator feedback are visible.
