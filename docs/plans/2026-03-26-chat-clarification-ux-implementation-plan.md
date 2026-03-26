# Chat Clarification UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a first-class clarification reply flow with pending-thread badges, clickable clarification options, and composer reply context.

**Architecture:** Derive pending clarification state from existing thread message history instead of adding new backend fields. Thread-level state is computed once, then passed into the sidebar, transcript, and composer so all surfaces share the same pending-reply model. Option selection reuses the existing human-message submit path rather than creating a separate transport.

**Tech Stack:** React 19, Next.js App Router, TypeScript, TanStack Query, existing `PromptInput` primitives, node:test source-contract tests

---

### Task 1: Add Pending Clarification Derivation

**Files:**
- Create: `frontend/src/core/threads/clarification.ts`
- Test: `frontend/src/core/threads/clarification.test.ts`
- Modify: `frontend/src/core/threads/index.ts`

**Step 1: Write the failing test**

Add tests for:
- unresolved clarification with options returns pending state
- later human reply clears it
- multiple clarifications choose the newest unresolved one
- clarification without options does not count

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend exec node --test src/core/threads/clarification.test.ts`
Expected: FAIL because helper does not exist yet

**Step 3: Write minimal implementation**

Create a pure helper that inspects `Message[]` and returns a normalized `PendingClarification | null`.

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend exec node --test src/core/threads/clarification.test.ts`
Expected: PASS

**Step 5: Commit**

Commit only the helper and tests.

### Task 2: Expose Pending State in Thread and Sidebar Layers

**Files:**
- Modify: `frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `frontend/src/components/workspace/recent-chat-list.tsx`
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/utils.ts`
- Test: `frontend/src/components/workspace/recent-chat-list.contract.test.ts`

**Step 1: Write the failing test**

Add a source-contract test that proves the recent chat list:
- derives pending clarification
- renders a `待回复` label
- sorts pending threads ahead of normal threads

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend exec node --test src/components/workspace/recent-chat-list.contract.test.ts`
Expected: FAIL because the source does not yet reference pending clarification UI

**Step 3: Write minimal implementation**

- thread page computes pending clarification once
- recent chat list derives pending state per thread and reorders list
- thread utility/types expose small shared helpers if needed

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend exec node --test src/components/workspace/recent-chat-list.contract.test.ts`
Expected: PASS

**Step 5: Commit**

Commit sidebar pending-state work.

### Task 3: Add Clarification Card Rendering

**Files:**
- Create: `frontend/src/components/workspace/messages/clarification-card.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/index.ts`
- Test: `frontend/src/components/workspace/messages/clarification-card.contract.test.ts`

**Step 1: Write the failing test**

Add a contract test that asserts the new card source contains:
- `需要你的协助`
- `回复后将继续当前任务`
- adaptive button/list rendering branch

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend exec node --test src/components/workspace/messages/clarification-card.contract.test.ts`
Expected: FAIL because the component does not exist yet

**Step 3: Write minimal implementation**

- render question and context
- render button mode for short options
- render single-select fallback for dense options
- expose callbacks for option selection
- integrate card into `message-list.tsx`

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend exec node --test src/components/workspace/messages/clarification-card.contract.test.ts`
Expected: PASS

**Step 5: Commit**

Commit clarification-card integration.

### Task 4: Reuse Composer Submit Path for Clarification Replies

**Files:**
- Modify: `frontend/src/components/workspace/input-box.tsx`
- Modify: `frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Test: `frontend/src/components/workspace/input-box.clarification.contract.test.ts`

**Step 1: Write the failing test**

Add a source-contract test that proves:
- the composer accepts a pending clarification prop
- placeholder/context copy changes in pending mode
- clarification option selection routes through the existing submit callback

**Step 2: Run test to verify it fails**

Run: `pnpm --dir frontend exec node --test src/components/workspace/input-box.clarification.contract.test.ts`
Expected: FAIL because pending clarification support is not wired yet

**Step 3: Write minimal implementation**

- add `pendingClarification` prop
- render pending-response strip above textarea
- add a thread-page callback that submits selected option text through existing `handleSubmit`

**Step 4: Run test to verify it passes**

Run: `pnpm --dir frontend exec node --test src/components/workspace/input-box.clarification.contract.test.ts`
Expected: PASS

**Step 5: Commit**

Commit composer clarification support.

### Task 5: Verify Full Slice

**Files:**
- Test: `frontend/src/core/threads/clarification.test.ts`
- Test: `frontend/src/components/workspace/recent-chat-list.contract.test.ts`
- Test: `frontend/src/components/workspace/messages/clarification-card.contract.test.ts`
- Test: `frontend/src/components/workspace/input-box.clarification.contract.test.ts`
- Modify if needed: any touched implementation file above

**Step 1: Run focused test suite**

Run: `pnpm --dir frontend exec node --test src/core/threads/clarification.test.ts src/components/workspace/recent-chat-list.contract.test.ts src/components/workspace/messages/clarification-card.contract.test.ts src/components/workspace/input-box.clarification.contract.test.ts`
Expected: PASS

**Step 2: Run static checks**

Run: `pnpm --dir frontend check`
Expected: PASS

**Step 3: Review for patch-on-patch drift**

Check whether the implementation introduced duplicated pending-state logic or multiple reply paths. If so, refactor before concluding.

**Step 4: Commit**

Commit any final cleanup needed after verification.
