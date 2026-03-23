# Session Policy Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the `Nion-Agent` session-policy page while keeping the current repo's title, suggestions, summarization, and subagent runtime logic.

**Architecture:** Use the Config Center to edit existing config sections: `title`, `summarization`, `subagents`, and any typed `suggestions` config added for UI safety.

**Tech Stack:** React, Config Center hooks, existing backend policy config modules

---

**Dependency:** Module 03 must be complete.
**E2E Gate:** Stop after this module and wait for user approval before starting Module 05.

### Task 1: Type Missing Policy Sections

**Files:**
- Create: `backend/packages/harness/deerflow/config/suggestions_config.py`
- Modify: `backend/packages/harness/deerflow/config/app_config.py`
- Test: `backend/tests/test_session_policy_config.py`

### Task 2: Port Session Policy Page

**Files:**
- Create: `frontend/src/components/workspace/settings/session-policy-settings-page.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/title-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/suggestions-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/summarization-section.tsx`
- Create: `frontend/src/components/workspace/settings/configuration/sections/subagents-section.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`

Steps:

1. Port the visual grouping from `Nion-Agent`.
2. Bind all sections to store-backed config.
3. Keep current repo policy behavior untouched except for configuration entry path.

### Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_session_policy_config.py -q
```

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm check
```

### Human E2E Checklist

- Title generation toggle/model settings save and take effect.
- Suggestions settings save and return expected behavior.
- Summarization and subagent timeout settings persist correctly.
