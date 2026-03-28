# Frontend Lint Debt And Runtime Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clear the current `frontend` lint blockers that are preventing branch-wide quality gates, and harden the new web/desktop runtime unification path with explicit verification where the current work still relies on manual confidence.

**Architecture:** Do not expand the product scope. This plan is a stabilization pass over the just-landed runtime convergence work. Fix lint debt in small clusters that share the same root cause, keep behavioral changes minimal, and add verification only where it directly protects the web `3000`, compatibility `2026`, and desktop `5173` flows.

**Tech Stack:** TypeScript, React 19, Next.js 16, Electron 35, Vite 7, ESLint 9, node:test

---

## Ground Rules

- No new dependencies.
- No “while I’m here” refactors outside the files listed in each task.
- Prefer `--fix`-style cleanup manually applied with reviewable diffs over broad rewrites.
- If a lint issue suggests a behavior change, write a failing test first.
- Keep commits focused by issue family.
- Do not touch the unrelated notebook/bridge work already dirty in this branch unless a task explicitly lists those files.

## Definition of Done

- `cd frontend && pnpm lint` passes.
- `cd frontend && pnpm typecheck` still passes.
- `pnpm --dir frontend build` still passes.
- `make web-dev`, `make web-start`, and `make desktop-dev` still satisfy the shared-surface smoke checklist.
- At least one automated assertion exists for the desktop Vite dev path beyond “the app opened”.

## Verification Matrix

- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`
- `pnpm --dir frontend build`
- `node --test frontend/tests/next-config.contract.test.mjs frontend/tests/runtime-api-contract.test.mjs frontend/tests/makefile-surface.contract.test.mjs frontend/tests/product-docs.contract.test.mjs`
- `cd desktop && node --test tests/dev-renderer.contract.test.mjs tests/bridge-main-contract.test.mjs`
- `make web-dev`
- `make web-start`
- `make desktop-dev`

## Task 1: Remove Foundational `any` Types From Shared Thread Models

**Files:**
- Modify: `frontend/next-shims.d.ts`
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`
- Test: `frontend/src/core/threads/desktop-client.test.ts`

**Step 1: Write the failing type-focused contract test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

void test("shared thread types avoid explicit any in core thread model files", async () => {
  const files = [
    new URL("../types.ts", import.meta.url),
    new URL("../../api/desktop-client.ts", import.meta.url),
    new URL("../../../next-shims.d.ts", import.meta.url),
  ];

  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\bany\b/);
  }
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --test frontend/src/core/threads/desktop-client.test.ts
```

Expected: FAIL because the current files still contain `any`.

**Step 3: Replace `any` with narrow runtime-safe types**

Use shapes like:

```ts
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

export type ToolCall = {
  id?: string;
  name: string;
  args: Record<string, JSONValue>;
};
```

And in `desktop-client.ts`, replace:

```ts
onEvent?: (event: string, data: any) => void;
```

with:

```ts
onEvent?: (event: string, data: Record<string, unknown>) => void;
```

**Step 4: Run lint on only the touched files**

Run:

```bash
cd frontend && pnpm eslint next-shims.d.ts src/core/threads/types.ts src/core/api/desktop-client.ts src/core/threads/desktop-client.test.ts
```

Expected: PASS for those files.

**Step 5: Commit**

```bash
git add frontend/next-shims.d.ts \
  frontend/src/core/threads/types.ts \
  frontend/src/core/api/desktop-client.ts \
  frontend/src/core/threads/desktop-client.test.ts
git commit -m "fix: remove explicit any from shared thread model layer"
```

### Task 2: Clean Thread/Test Lint Debt In The Shared Runtime Data Layer

**Files:**
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/threads/utils.ts`
- Modify: `frontend/src/core/threads/export.ts`
- Modify: `frontend/src/core/threads/cache.test.ts`
- Modify: `frontend/src/core/threads/clarification.test.ts`
- Modify: `frontend/src/core/threads/error-copy.test.ts`
- Modify: `frontend/src/core/messages/usage.test.ts`

**Step 1: Write one failing import-order regression test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

void test("thread hook imports keep external, internal, and relative groups ordered", async () => {
  const source = fs.readFileSync(
    new URL("./hooks.ts", import.meta.url),
    "utf8",
  );

  assert.ok(source.indexOf('import { getAPIClient } from "../api";') < source.indexOf('import { removeThreadFromSearchCache } from "./cache";'));
});
```

**Step 2: Run the local lint check to confirm failures**

Run:

```bash
cd frontend && pnpm eslint \
  src/core/threads/hooks.ts \
  src/core/threads/utils.ts \
  src/core/threads/export.ts \
  src/core/threads/cache.test.ts \
  src/core/threads/clarification.test.ts \
  src/core/threads/error-copy.test.ts \
  src/core/messages/usage.test.ts
```

Expected: FAIL with `import/order`, `no-floating-promises`, and assertion-style issues.

**Step 3: Apply minimal cleanup**

- Reorder imports only; do not change semantics.
- Prefix intentionally ignored promises with `void`.
- Replace unnecessary type assertions with the inferred value directly.
- Use optional chaining where lint asks for readability only.

**Step 4: Re-run the targeted lint check**

Run the same command from Step 2.

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/core/threads/hooks.ts \
  frontend/src/core/threads/utils.ts \
  frontend/src/core/threads/export.ts \
  frontend/src/core/threads/cache.test.ts \
  frontend/src/core/threads/clarification.test.ts \
  frontend/src/core/threads/error-copy.test.ts \
  frontend/src/core/messages/usage.test.ts
git commit -m "fix: clean lint debt in shared thread hooks and tests"
```

### Task 3: Fix Workspace Route And Sidebar Lint Issues Without Changing Runtime Behavior

**Files:**
- Modify: `frontend/src/app/workspace/chats/page.tsx`
- Modify: `frontend/src/app/workspace/agents/page.tsx`
- Modify: `frontend/src/app/workspace/agents/agent-chat-page.tsx`
- Modify: `frontend/src/components/workspace/recent-chat-list.tsx`
- Modify: `frontend/src/components/workspace/workspace-sidebar-primary-action.tsx`
- Modify: `frontend/src/components/workspace/chats/chat-box.tsx`

**Step 1: Write a failing route-shell contract test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

void test("workspace route shells keep Suspense wrappers around search-param consumers", async () => {
  const chatsPage = fs.readFileSync(
    new URL("../../app/workspace/chats/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(chatsPage, /<Suspense fallback=\{null\}>/);
});
```

**Step 2: Run targeted lint**

Run:

```bash
cd frontend && pnpm eslint \
  src/app/workspace/chats/page.tsx \
  src/app/workspace/agents/page.tsx \
  src/app/workspace/agents/agent-chat-page.tsx \
  src/components/workspace/recent-chat-list.tsx \
  src/components/workspace/workspace-sidebar-primary-action.tsx \
  src/components/workspace/chats/chat-box.tsx
```

Expected: FAIL mostly on `import/order`.

**Step 3: Clean import ordering only**

Do not rewrite page logic. Keep the current Suspense wrappers and runtime flow untouched.

**Step 4: Re-run targeted lint and one functional build**

Run:

```bash
cd frontend && pnpm eslint \
  src/app/workspace/chats/page.tsx \
  src/app/workspace/agents/page.tsx \
  src/app/workspace/agents/agent-chat-page.tsx \
  src/components/workspace/recent-chat-list.tsx \
  src/components/workspace/workspace-sidebar-primary-action.tsx \
  src/components/workspace/chats/chat-box.tsx
pnpm --dir frontend build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/app/workspace/chats/page.tsx \
  frontend/src/app/workspace/agents/page.tsx \
  frontend/src/app/workspace/agents/agent-chat-page.tsx \
  frontend/src/components/workspace/recent-chat-list.tsx \
  frontend/src/components/workspace/workspace-sidebar-primary-action.tsx \
  frontend/src/components/workspace/chats/chat-box.tsx
git commit -m "fix: clean workspace route shell lint debt"
```

### Task 4: Repair Notebook Lint And Hook-Order Violations In The Current Notebook Cluster

**Files:**
- Modify: `frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-create-dialog.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-folder-dialog.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-folder-picker.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-trash-page.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-tree-view.tsx`

**Step 1: Write the failing hook-order regression test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

void test("Notebook tree view does not call hooks conditionally", async () => {
  const source = fs.readFileSync(
    new URL("./notebook-tree-view.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /if \\(.*\\) \\{\\s*const \\[/s);
});
```

**Step 2: Run targeted lint**

Run:

```bash
cd frontend && pnpm eslint src/components/workspace/notebook
```

Expected: FAIL on import ordering, unused bindings, nullish-coalescing suggestions, and a `react-hooks/rules-of-hooks` violation.

**Step 3: Fix the real bug first**

In `notebook-tree-view.tsx`, move all hook calls to the top level of the component before any early return or conditional branch.

**Step 4: Fix the cheap lint debt**

- Remove unused imports and args.
- Reorder imports.
- Use `??` only where the fallback semantics remain identical.
- If an argument is intentionally unused, rename it to `_name`.

**Step 5: Re-run notebook lint and typecheck**

Run:

```bash
cd frontend && pnpm eslint src/components/workspace/notebook
cd frontend && pnpm typecheck
```

Expected: PASS.

**Step 6: Commit**

```bash
git add frontend/src/components/workspace/notebook/notebook-context-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-create-dialog.tsx \
  frontend/src/components/workspace/notebook/notebook-folder-dialog.tsx \
  frontend/src/components/workspace/notebook/notebook-folder-picker.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx \
  frontend/src/components/workspace/notebook/notebook-trash-page.tsx \
  frontend/src/components/workspace/notebook/notebook-tree-view.tsx
git commit -m "fix: clean notebook lint debt and hook-order issues"
```

### Task 5: Clean Bridge And Settings Lint Debt In Place

**Files:**
- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Modify: `frontend/src/components/workspace/bridge/DiscordBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/FeishuBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/QqBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/TelegramBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/WeixinBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/bridge-shared.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/suggestions-section.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/summarization-section.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/title-section.tsx`

**Step 1: Write the failing layout contract test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

void test("Bridge layout does not contain an empty noop callback", async () => {
  const source = fs.readFileSync(
    new URL("./BridgeLayout.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\(\)\s*=>\s*\{\s*\}/);
});
```

**Step 2: Run targeted lint**

Run:

```bash
cd frontend && pnpm eslint \
  src/components/workspace/bridge \
  src/components/workspace/settings/configuration/sections/suggestions-section.tsx \
  src/components/workspace/settings/configuration/sections/summarization-section.tsx \
  src/components/workspace/settings/configuration/sections/title-section.tsx
```

Expected: FAIL on import ordering, empty callback, and `prefer-nullish-coalescing`.

**Step 3: Apply safe local cleanups**

- Replace empty callbacks with `undefined`-based branching or named noop constants only where the prop requires a function.
- Reorder imports.
- Convert `||` to `??` only when the left side may legitimately be `""` or `0` and preserving those values is correct.

**Step 4: Re-run targeted lint**

Run the same command from Step 2.

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/workspace/bridge/BridgeLayout.tsx \
  frontend/src/components/workspace/bridge/DiscordBridgeSection.tsx \
  frontend/src/components/workspace/bridge/FeishuBridgeSection.tsx \
  frontend/src/components/workspace/bridge/QqBridgeSection.tsx \
  frontend/src/components/workspace/bridge/TelegramBridgeSection.tsx \
  frontend/src/components/workspace/bridge/WeixinBridgeSection.tsx \
  frontend/src/components/workspace/bridge/bridge-shared.tsx \
  frontend/src/components/workspace/settings/configuration/sections/suggestions-section.tsx \
  frontend/src/components/workspace/settings/configuration/sections/summarization-section.tsx \
  frontend/src/components/workspace/settings/configuration/sections/title-section.tsx
git commit -m "fix: clean bridge and settings lint debt"
```

### Task 6: Run Branch-Wide Frontend Gate And Re-verify The Unified Runtime Paths

**Files:**
- Modify: `docs/desktop/development.md`
- Modify: `docs/plans/2026-03-27-frontend-lint-and-runtime-verification.md`

**Step 1: Add the final verification checklist to the docs**

```md
## Frontend Quality Gate

1. `cd frontend && pnpm lint`
2. `cd frontend && pnpm typecheck`
3. `pnpm --dir frontend build`
4. `make web-dev`
5. `make web-start`
6. `make desktop-dev`
```

**Step 2: Run the branch-wide gate**

Run:

```bash
cd frontend && pnpm lint
cd frontend && pnpm typecheck
pnpm --dir frontend build
node --test frontend/tests/next-config.contract.test.mjs frontend/tests/runtime-api-contract.test.mjs frontend/tests/makefile-surface.contract.test.mjs frontend/tests/product-docs.contract.test.mjs
cd desktop && node --test tests/dev-renderer.contract.test.mjs tests/bridge-main-contract.test.mjs
```

Expected: PASS.

**Step 3: Run the runtime smoke checklist**

Run:

```bash
make web-dev
make web-start
make desktop-dev
```

Expected:

- `3000/workspace/chats` shows thread data
- `2026/workspace/chats` shows the same thread data
- desktop loads `http://127.0.0.1:5173` in dev without CORS failures

**Step 4: Commit**

```bash
git add docs/desktop/development.md docs/plans/2026-03-27-frontend-lint-and-runtime-verification.md
git commit -m "docs: record the frontend lint and runtime verification gate"
```

## Notes For The Implementer

- If `pnpm lint` reveals additional files after earlier cleanup, append them to the relevant task instead of inventing a new architecture task.
- Keep notebook cleanup separate from bridge cleanup even if both are “just lint”; they are different risk surfaces.
- Do not touch the unrelated dirty files currently in the root worktree unless you first move this work into a dedicated worktree.
- If any lint rule fights the intended runtime behavior, stop and open a follow-up plan instead of suppressing the rule inline.
