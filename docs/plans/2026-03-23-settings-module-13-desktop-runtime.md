# Desktop Runtime Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a runtime diagnostics/settings page only if the current repo has equivalent runtime controls worth exposing, and make it meaningful in both desktop and web deployments.

**Architecture:** This page must be feature-detected, but it should not assume desktop is the only meaningful runtime surface. In web deployments, the page should still surface runtime topology, host-execution availability, and diagnostic state for the backend/server host; desktop-only controls remain additionally gated behind the desktop bridge.

**Tech Stack:** React, desktop bridge APIs, runtime settings services

---

**Dependency:** Module 12 must be complete.
**E2E Gate:** Stop after this module and treat it as the final gated handoff for the settings rollout.

### Task 1: Capability Audit

**Files:**
- Inspect desktop bridge and runtime APIs in the current repo
- Create missing backend/runtime endpoints only if they are product-approved

Steps:

1. Audit which runtime facts are relevant in web and desktop.
2. Separate web-valid diagnostics from desktop-only controls.
3. Do not hide the whole page in web if runtime diagnostics exist there.

### Task 2: Port Desktop Runtime Page

**Files:**
- Create: `frontend/src/components/workspace/settings/desktop-runtime-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Create or port supporting hooks/types if needed

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

Plus any backend/runtime tests added in this module.

### Human E2E Checklist

- Web deployments show meaningful runtime diagnostics and host-execution state.
- Desktop deployments show the additional runtime controls that only desktop can support.
- Runtime controls reflect real state and produce real effects.
