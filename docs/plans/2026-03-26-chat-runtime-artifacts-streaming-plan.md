# Chat Runtime Artifacts And Streaming Fix Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore genuinely incremental chat streaming, make generated files resolvable and visible in Electron, and simplify the right-side file/workspace interaction model so it matches user expectations.

**Architecture:** Treat the current issues as a shared runtime-surface problem, not isolated UI glitches. The artifact lane should use actual thread filesystem state instead of trusting stale presented paths, the workspace lane should expose the thread user-data root rather than only `workdir`, and the header should stop exposing a top-level file button that conflicts with the list-first artifact flow. Streaming must be investigated from the embedded client outward so the fix restores incremental message updates at the event source rather than faking animation in the UI.

**Tech Stack:** React 19, Next.js App Router, TanStack Query, Electron desktop bridge, FastAPI gateway routes, embedded Python `NionClient`, node:test contract tests, pytest

---

### Task 1: Lock Down Artifact And Workspace Root Expectations

**Files:**
- Test: `frontend/src/components/workspace/chats/chat-box.artifacts.contract.test.ts`
- Test: `backend/tests/test_present_file_tool.py`
- Modify: `frontend/src/components/workspace/chats/chat-box.tsx`
- Modify: `backend/packages/harness/nion/tools/builtins/present_file_tool.py`

**Step 1: Write the failing tests**

Add tests proving:
- chat workspace browsing is rooted at `/mnt/user-data`, not only `/mnt/user-data/workspace`
- presented artifacts must exist before they are accepted into thread state

**Step 2: Run tests to verify they fail**

Run: `pnpm --dir frontend exec node --test src/components/workspace/chats/chat-box.artifacts.contract.test.ts`
Expected: FAIL because the chat box still uses `/mnt/user-data/workspace`

Run: `cd backend && uv run pytest tests/test_present_file_tool.py -q`
Expected: FAIL because `present_files` does not validate actual existence yet

**Step 3: Write minimal implementation**

- point the workspace browser panel at `/mnt/user-data`
- keep composer path mentions scoped separately if needed
- make `present_files` reject non-existent output paths before creating artifact entries

**Step 4: Run tests to verify they pass**

Run the same commands; expect PASS

**Step 5: Commit**

Commit the filesystem-source-of-truth fix.

### Task 2: Make Artifact UI Use Real Files And Remove The Header File Button

**Files:**
- Test: `frontend/src/components/workspace/artifacts/artifact-trigger.contract.test.ts`
- Modify: `frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `frontend/src/app/workspace/agents/agent-chat-page.tsx`
- Modify: `frontend/src/components/workspace/artifacts/artifact-trigger.tsx`
- Modify: `frontend/src/components/workspace/chats/chat-box.tsx`
- Modify: `frontend/src/components/workspace/artifacts/artifact-file-detail.tsx`

**Step 1: Write the failing tests**

Add source-contract tests proving:
- the top-right `ArtifactTrigger` is removed from chat pages
- artifact opening is driven by clicking a file in the panel/list, not by a dedicated header button

**Step 2: Run tests to verify they fail**

Run: `pnpm --dir frontend exec node --test src/components/workspace/artifacts/artifact-trigger.contract.test.ts`
Expected: FAIL because the header still renders `ArtifactTrigger`

**Step 3: Write minimal implementation**

- remove `ArtifactTrigger` from chat and agent chat headers
- keep the artifact panel available through artifact list item clicks
- ensure panel list state is usable when multiple files exist
- keep “working directory/workspace” and “artifact file detail” as separate, non-conflicting modes

**Step 4: Run tests to verify they pass**

Run the same test command; expect PASS

**Step 5: Commit**

Commit header-action cleanup and artifact entrypoint simplification.

### Task 3: Fix Artifact Download/Preview Routing In Electron

**Files:**
- Test: `frontend/src/core/artifacts/utils.test.ts`
- Test: `backend/tests/test_artifacts_router.py`
- Modify: `frontend/src/core/artifacts/utils.ts`
- Modify: `frontend/src/core/artifacts/loader.ts`
- Modify: `backend/app/gateway/routers/artifacts.py`
- Modify if needed: `backend/app/gateway/path_utils.py`

**Step 1: Write the failing tests**

Add tests covering:
- generated output paths resolve correctly for preview and download
- missing paths return stable errors
- Electron backend base URL composition produces usable artifact URLs

**Step 2: Run tests to verify they fail**

Run: `pnpm --dir frontend exec node --test src/core/artifacts/utils.test.ts`
Expected: FAIL if current URL building and download semantics are insufficiently covered

Run: `cd backend && uv run pytest tests/test_artifacts_router.py -q`
Expected: FAIL once route expectations are encoded

**Step 3: Write minimal implementation**

- ensure URL construction is explicit and stable for preview/download
- ensure loader detects non-OK responses instead of blindly returning `{"detail":"Not Found"}`
- make artifact route behavior easier to diagnose when the file truly does not exist

**Step 4: Run tests to verify they pass**

Run the same commands; expect PASS

**Step 5: Commit**

Commit artifact routing and diagnostics fixes.

### Task 4: Restore Incremental Streaming

**Files:**
- Test: `frontend/src/core/threads/desktop-client.test.ts`
- Test: `backend/tests/test_client_streaming_updates.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify if needed: `desktop/src/main/bridge/nion-thread-client.ts`

**Step 1: Write the failing tests**

Add tests proving:
- repeated updates for the same AI message id are surfaced rather than dropped
- frontend stream handling updates in-place as incremental content arrives

**Step 2: Run tests to verify they fail**

Run: `cd backend && uv run pytest tests/test_client_streaming_updates.py -q`
Expected: FAIL because repeated same-id updates are currently deduplicated away

Run: `pnpm --dir frontend exec node --test src/core/threads/desktop-client.test.ts`
Expected: FAIL once incremental update expectations are added

**Step 3: Write minimal implementation**

- investigate whether the embedded agent yields repeated same-id message snapshots
- if yes, stop treating same-id messages as permanently deduplicated in the client stream layer
- if needed, emit updated `messages-tuple` events when same-id AI content changes
- keep final snapshot merging logic intact

**Step 4: Run tests to verify they pass**

Run the same commands; expect PASS

**Step 5: Commit**

Commit incremental streaming restoration.

### Task 5: Verify The End-To-End Runtime Slice

**Files:**
- Test: `frontend/src/components/workspace/chats/chat-box.artifacts.contract.test.ts`
- Test: `frontend/src/components/workspace/artifacts/artifact-trigger.contract.test.ts`
- Test: `frontend/src/core/artifacts/utils.test.ts`
- Test: `frontend/src/core/threads/desktop-client.test.ts`
- Test: `backend/tests/test_present_file_tool.py`
- Test: `backend/tests/test_artifacts_router.py`
- Test: `backend/tests/test_client_streaming_updates.py`

**Step 1: Run focused frontend tests**

Run: `pnpm --dir frontend exec node --test src/components/workspace/chats/chat-box.artifacts.contract.test.ts src/components/workspace/artifacts/artifact-trigger.contract.test.ts src/core/artifacts/utils.test.ts src/core/threads/desktop-client.test.ts src/core/messages/internal-summary.test.ts src/core/threads/clarification.test.ts src/components/workspace/recent-chat-list.contract.test.ts src/components/workspace/messages/clarification-card.contract.test.ts src/components/workspace/input-box.clarification.contract.test.ts src/components/workspace/settings/summarization-section.defaults.test.ts`
Expected: PASS

**Step 2: Run focused backend tests**

Run: `cd backend && uv run pytest tests/test_present_file_tool.py tests/test_artifacts_router.py tests/test_client_streaming_updates.py tests/test_summarization_config.py tests/test_lead_agent_summarization_defaults.py -q`
Expected: PASS

**Step 3: Run static checks**

Run: `pnpm --dir frontend typecheck`
Expected: PASS

**Step 4: Review for patch-on-patch drift**

Check that:
- artifact source of truth is not split across stale thread state and real filesystem without clear precedence
- workspace browsing and artifact viewing have distinct interaction modes
- streaming updates are handled in one place and not duplicated across bridge/frontend paths

**Step 5: Commit**

Commit final cleanup if verification surfaces any small follow-up edits.
