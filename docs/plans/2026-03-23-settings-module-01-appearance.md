# Appearance Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the appearance page so its layout, cards, and interaction style match `Nion-Agent`, while keeping the current repo's theme/localization plumbing.

**Architecture:** Reuse current local theme and locale storage, but port the visual composition and copy structure from `Nion-Agent`.

**Tech Stack:** React, next-themes, local settings, shadcn/ui

---

**Dependency:** Module 00 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 02.

### Task 1: Port Page Structure

**Files:**
- Modify: `frontend/src/components/workspace/settings/appearance-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-section.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

Steps:

1. Port the `Nion-Agent` page rhythm: section title, description, option cards, and spacing.
2. Keep existing theme and locale behavior intact.
3. Replace user-facing `DeerFlow` references with `Nion`.

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Theme card selection works.
- Language switch still works.
- Page looks like the `Nion-Agent` style, not the old simple DeerFlow panel.
