# Skill Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the skills settings page to the `Nion-Agent` style while preserving the current repo's skill backend and skill-install flow, and keep the donor requested-skills composer flow aligned.

**Architecture:** Keep the current `/api/skills` behavior. Port the richer page composition, filtering, and copy model from `Nion-Agent`. The skill metadata exposed here must also be usable by the chat composer's `Skill` shortcut lane so requested skills survive submission into runtime context.

**Tech Stack:** React, TanStack Query, existing skills API

---

**Dependency:** Module 06 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 08.

### Task 1: Port Skills Page

**Files:**
- Modify: `frontend/src/components/workspace/settings/skill-settings-page.tsx`
- Create or port: `frontend/src/components/workspace/settings/skill-import-dialog.tsx`
- Modify: `frontend/src/core/skills/hooks.ts`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`

### Task 2: Keep Existing Skill APIs Stable

**Files:**
- Modify: `backend/app/gateway/routers/skills.py`
- Test: `backend/tests/test_skills_api.py`

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_skills_api.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Public/custom skill filtering works.
- Enable/disable works.
- If import/install UI is wired, it behaves correctly.
- Skills chosen from the chat composer shortcut lane land in the outgoing runtime context as requested skills.
