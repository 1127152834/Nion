# MCP Servers Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the MCP server settings page in `Nion-Agent` style while keeping the current repo's extensions/MCP backend intact, and expose the MCP metadata needed by the chat composer's MCP shortcut lane.

**Architecture:** Do not fold MCP into the app config store yet. Keep the existing `/api/mcp/config` backend path, but port the operator UX and section structure from `Nion-Agent`. The same API surface should also provide a stable active-tool catalog for the chat composer so settings and runtime use one source of truth.

**Tech Stack:** React, TanStack Query, existing MCP API

---

**Dependency:** Module 05 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 07.

### Task 1: Port MCP Page

**Files:**
- Create: `frontend/src/components/workspace/settings/mcp-servers-page.tsx`
- Modify: `frontend/src/core/mcp/api.ts`
- Modify: `frontend/src/core/mcp/hooks.ts`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`

### Task 2: Polish Existing MCP API Contracts

**Files:**
- Modify: `backend/app/gateway/routers/mcp.py`
- Test: `backend/tests/test_mcp_config_api.py`

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_mcp_config_api.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- MCP servers list renders in the new style.
- Enable/disable and edit flow works.
- Existing MCP configuration still takes effect at runtime.
- MCP tools selected from the chat composer shortcut lane reflect the saved active-tool state.
