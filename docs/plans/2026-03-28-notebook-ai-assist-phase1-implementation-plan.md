# Notebook AI Assist Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the notebook right rail from placeholder AI buttons into a real phase-1 collaboration surface with live assist generation, real chat import sources, and visible loading/error/result states.

**Architecture:** Reuse Nion's existing runtime model stack for notebook assist generation and reuse thread repository data for chat import candidates. Keep phase 1 whole-note only, keep apply modes to `replace` and `insert`, and let the UI differentiate rewrite vs derived outputs using backend metadata instead of introducing selection-aware editing yet.

**Tech Stack:** FastAPI, Pydantic, LangChain chat model factory, existing notebook router/service layer, React, TanStack Query, existing notebook API/hooks layer.

---

### Task 1: Lock the backend API contract with failing tests

**Files:**
- Modify: `backend/tests/test_notebook_api.py`

**Steps:**
1. Add a failing test for `assist-preview` that expects metadata beyond `content`, including action kind and recommended apply mode.
2. Monkeypatch model creation so the route is deterministic under test.
3. Add a failing test for a new `GET /api/notebook/import-sources?source=chat` route.
4. Seed thread repository data with recent assistant messages and verify the route returns recent import candidates in descending recency.

### Task 2: Lock the frontend notebook data layer with failing tests

**Files:**
- Modify: `frontend/src/core/notebook/api.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts`

**Steps:**
1. Add failing tests for `loadNotebookImportSources`.
2. Extend the assist preview test to require the new metadata fields.
3. Extend the context panel contract test to require import-source-driven rendering and panel-visible loading/error/result state hooks.

### Task 3: Implement backend notebook assist generation and import-source listing

**Files:**
- Modify: `backend/packages/harness/nion/notebook/assist.py`
- Modify: `backend/app/gateway/routers/notebook.py`

**Steps:**
1. Replace template-only assist preview logic with prompt-based generation through `create_chat_model`.
2. Add a small action metadata map for rewrite vs derived outputs.
3. Normalize model output into notebook-safe markdown text.
4. Add import-source extraction helpers that scan thread repository records for recent assistant replies.
5. Expose `GET /api/notebook/import-sources`.
6. Keep `assist-apply` and `import` compatible with current note history semantics.

### Task 4: Implement frontend API, hooks, and right-rail interaction changes

**Files:**
- Modify: `frontend/src/core/notebook/types.ts`
- Modify: `frontend/src/core/notebook/api.ts`
- Modify: `frontend/src/core/notebook/hooks.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

**Steps:**
1. Add import-source types and assist preview metadata types.
2. Add a query hook for import sources.
3. Rebuild the Ask tab so it shows:
   - whole-note working context
   - assist cards with short descriptions
   - in-panel loading and error states
   - action-specific preview apply labels
   - real import source cards
   - note-to-chat handoff card
4. Keep phase 1 whole-note only and do not fake selection scope.

### Task 5: Verify end to end

**Files:**
- Modify as needed if tests expose defects.

**Steps:**
1. Run notebook backend tests.
2. Run notebook frontend tests.
3. Run frontend typecheck.
4. Run targeted frontend eslint on touched notebook files.
5. Re-review the diff to ensure the solution is not patch-on-patch and collapse any duplicated action mapping if needed.
