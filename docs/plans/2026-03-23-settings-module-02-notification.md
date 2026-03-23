# Notification Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade notification settings to the `Nion-Agent` visual standard without changing the current repo's notification behavior.

**Architecture:** Keep browser notification APIs and local settings as-is; only refactor the page structure, copy, and interaction polish.

**Tech Stack:** React, browser Notification API, local settings

---

**Dependency:** Module 01 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 03.

### Task 1: Port Notification Page UX

**Files:**
- Modify: `frontend/src/components/workspace/settings/notification-settings-page.tsx`
- Modify: `frontend/src/core/notification/hooks.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

Steps:

1. Refactor the page into the new section style.
2. Keep permission request, enable toggle, and test-notification flow.
3. Update copy to `Nion`.

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Notification permission request still works.
- Test notification still fires.
- Disabled / denied states render correctly.
