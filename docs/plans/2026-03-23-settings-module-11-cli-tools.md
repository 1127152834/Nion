# CLI Tools Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the CLI tools page only if the current repo has or gains the necessary backend/runtime surfaces, and use the same lane to power the chat composer's `CLI` shortcut.

**Architecture:** This is a gated feature-lane module. If the current repo does not yet have CLI marketplace, policy, and exposure APIs, implement those first or explicitly defer the page rather than shipping dead UI. The resulting catalog/policy surface should be reusable by both the settings page and the composer shortcut lane.

**Tech Stack:** React, TanStack Query, CLI backend/runtime services

---

**Dependency:** Module 10 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 12.

### Task 1: Capability Audit

**Files:**
- Inspect or create: `frontend/src/core/cli/*`
- Inspect or create corresponding backend CLI APIs

Steps:

1. Verify whether marketplace, install jobs, workspace policy, and path exposure exist.
2. Verify whether the chat composer can query a stable CLI catalog and policy summary from the same source.
3. If not, implement the missing backend/services first.

### Task 2: Port CLI Tools Page

**Files:**
- Create: `frontend/src/components/workspace/settings/cli-tools-page.tsx`
- Create or port: `frontend/src/core/cli/api.ts`
- Create or port: `frontend/src/core/cli/hooks.ts`
- Create or port: `frontend/src/core/cli/types.ts`

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Plus any backend CLI tests added in this module.

### Human E2E Checklist

- Marketplace tab works if shipped.
- Installed tools tab reflects actual state.
- Enable/disable or install/uninstall actions behave correctly.
- CLI items chosen from the chat composer shortcut lane reflect the same installed/allowed state.
