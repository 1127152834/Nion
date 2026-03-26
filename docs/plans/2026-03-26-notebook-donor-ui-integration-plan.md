# Notebook Donor UI Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current utilitarian notebook workspace with a three-pane notebook experience inspired by the AI Studio donor UI while preserving Nion's existing notebook APIs, history/trash guarantees, and desktop workspace routing.

**Architecture:** Treat `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook` as a donor reference only, not production code to merge. Keep `frontend/src/core/notebook/*`, `frontend/src/app/workspace/notebook/*`, and `backend/app/gateway/routers/notebook.py` plus `backend/packages/harness/nion/notebook/*` as the real contract. Rebuild the notebook screen by extracting smaller notebook UI components, wiring them to the existing TanStack Query hooks, and deferring donor features that need new backend/domain capabilities to a second wave.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind/shadcn/ui, TanStack Query, node:test contract tests, FastAPI, Python notebook/history services, Electron desktop shell.

---

## Ground Rules

- Do not import code from `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/*` directly.
- Do not add new frontend dependencies.
- Do not replace the notebook backend API in Wave 1.
- Do not fake donor features that Nion cannot actually support yet.
- Keep `/workspace/notebook` and `/workspace/notebook/trash` as the canonical desktop routes.
- Use `frontend/src/components/ui/resizable.tsx` and existing workspace layout patterns instead of inventing a new panel system.
- Reuse `frontend/src/components/workspace/messages/markdown-content.tsx` for Markdown preview instead of adding a second Markdown renderer.
- Preserve the existing notebook route integration and chat-to-notebook bridge:
  - `frontend/src/components/workspace/workspace-nav-chat-list.tsx`
  - `frontend/src/components/workspace/save-to-notebook-trigger.tsx`
  - `frontend/src/core/notebook/prompt.ts`

## Donor To Product Mapping

Use this mapping to avoid cargo-culting the donor project.

| Donor feature | Wave 1 action | Reason |
| --- | --- | --- |
| Three-pane layout | Implement | Matches the product direction and fits current workspace route |
| Left tree + recent + search | Implement | Can be derived from existing notebook tree response on the client |
| Markdown title/body editor | Implement | Already supported by notebook APIs |
| Edit/preview toggle | Implement | Can reuse existing Markdown renderer |
| Ask Nion tab | Implement, but route to chat only | Existing product already supports notebook-to-chat prompts |
| History tab in right panel | Implement | Existing history API already exists |
| Info tab | Implement with current note fields only | No pin/tag metadata contract yet |
| Friendly delete confirmation | Implement | Existing delete preview API supports this |
| Trash page styling | Implement | Existing trash API already exists |
| Quick capture modal | Implement with default `inbox` directory | Backend create-note API already supports directory creation on demand |
| Pinned notes | Defer to Wave 2 | No persisted pin metadata yet |
| AI preview -> replace/insert | Defer to Wave 2 | Needs notebook assist preview/apply capability |
| Attachment insertion UI | Defer to Wave 2 | Backend has attachment directory logic but no upload route/UI |
| Explicit folder creation | Defer to Wave 2 | No dedicated folder API or UX contract yet |

## Existing Source Of Truth

Frontend shell and route:

- `frontend/src/app/workspace/notebook/page.tsx`
- `frontend/src/app/workspace/notebook/trash/page.tsx`
- `frontend/src/components/workspace/notebook/notebook-page.tsx`
- `frontend/src/components/workspace/notebook/notebook-trash-page.tsx`

Frontend data layer:

- `frontend/src/core/notebook/types.ts`
- `frontend/src/core/notebook/api.ts`
- `frontend/src/core/notebook/hooks.ts`
- `frontend/src/core/notebook/tree.ts`
- `frontend/src/core/notebook/prompt.ts`

Backend APIs and services:

- `backend/app/gateway/routers/notebook.py`
- `backend/packages/harness/nion/notebook/service.py`
- `backend/packages/harness/nion/notebook/history.py`
- `backend/packages/harness/nion/notebook/models.py`

Existing tests:

- `frontend/src/components/workspace/notebook-routes.test.ts`
- `frontend/src/core/notebook/api.test.ts`
- `frontend/src/core/notebook/tree.test.ts`
- `frontend/src/core/notebook/prompt.test.ts`
- `backend/tests/test_notebook_api.py`
- `backend/tests/test_notebook_service.py`
- `backend/tests/test_notebook_history.py`

Donor reference files:

- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/App.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/Sidebar.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/Editor.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/ContextPanel.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/TrashView.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/Modals.tsx`

## Wave Split

### Wave 1: Ship The Donor UI On Top Of Existing Notebook APIs

Ship this in the first execution lane:

- three-pane notebook shell
- sidebar search/recent/tree
- improved editor header + Markdown preview
- right context panel with Ask Nion / History / Info
- create note dialog
- quick capture dialog
- friendly delete confirmation
- donor-styled trash page
- route cleanup for notebook trash
- locale copy updates

### Wave 2: New Capabilities Required For Full Donor Parity

Do not start until Wave 1 is green:

- notebook assist preview/apply
- attachment upload and note insertion
- persisted note metadata such as pinned/tags
- explicit folder creation
- notebook search endpoint or local index

## Task 1: Lock The Shell Boundary Before Refactoring

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-shell.contract.test.ts`
- Create: `frontend/src/components/workspace/notebook/notebook-sidebar.tsx`
- Create: `frontend/src/components/workspace/notebook/notebook-editor-pane.tsx`
- Create: `frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Test: `frontend/src/components/workspace/notebook/notebook-shell.contract.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookPage becomes a shell controller that renders extracted notebook panes", async () => {
  const source = await readFile(new URL("./notebook-page.tsx", import.meta.url), "utf8");

  assert.match(source, /ResizablePanelGroup/);
  assert.match(source, /NotebookSidebar/);
  assert.match(source, /NotebookEditorPane/);
  assert.match(source, /NotebookContextPanel/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-shell.contract.test.ts
```

Expected: `FAIL` because the current `notebook-page.tsx` still renders the old two-column card layout and the extracted pane components do not exist.

**Step 3: Write minimal implementation**

Create stub pane files and reduce `NotebookPage` to a controller with a resizable shell:

```tsx
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { NotebookSidebar } from "./notebook-sidebar";
import { NotebookEditorPane } from "./notebook-editor-pane";
import { NotebookContextPanel } from "./notebook-context-panel";

export function NotebookPage() {
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={24}>
        <NotebookSidebar />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={52}>
        <NotebookEditorPane />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={24}>
        <NotebookContextPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-shell.contract.test.ts
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/notebook/notebook-shell.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-sidebar.tsx \
  frontend/src/components/workspace/notebook/notebook-editor-pane.tsx \
  frontend/src/components/workspace/notebook/notebook-context-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx
git commit -F - <<'EOF'
Create a notebook shell boundary before donor UI work

The notebook route already has real APIs and history semantics, so the first safe move is to
reduce the page into a controller and extract pane boundaries before visual refactoring.

Constraint: Must preserve the existing /workspace/notebook route and notebook hooks
Rejected: Copy the Vite donor project into frontend | would fork the real data and routing stack
Confidence: high
Scope-risk: narrow
Directive: Keep NotebookPage orchestration-focused; push presentational detail into notebook subcomponents
Tested: cd frontend && node --test src/components/workspace/notebook/notebook-shell.contract.test.ts
Not-tested: visual layout parity
EOF
```

## Task 2: Extract Pure Sidebar State Helpers

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-sidebar-state.ts`
- Create: `frontend/src/components/workspace/notebook/notebook-sidebar-state.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-sidebar.tsx`
- Test: `frontend/src/components/workspace/notebook/notebook-sidebar-state.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecentNotebookFiles,
  collectRootNotebookFiles,
  filterNotebookTreeNodes,
} from "./notebook-sidebar-state";

void test("buildRecentNotebookFiles sorts by mtime desc and caps results", () => {
  const recent = buildRecentNotebookFiles(
    [
      { note_id: "a", path: "a.md", name: "a.md", depth: 1, size: 1, mtime: 1 },
      { note_id: "b", path: "b.md", name: "b.md", depth: 1, size: 1, mtime: 5 },
      { note_id: "c", path: "c.md", name: "c.md", depth: 1, size: 1, mtime: 3 },
    ],
    2,
  );

  assert.deepEqual(recent.map((item) => item.note_id), ["b", "c"]);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-sidebar-state.test.ts
```

Expected: `FAIL` because the helper module does not exist yet.

**Step 3: Write minimal implementation**

```ts
import type { NotebookFileEntry } from "@/core/notebook";
import type { NotebookTreeNode } from "@/core/notebook";

export function buildRecentNotebookFiles(files: NotebookFileEntry[], limit = 6) {
  return [...files]
    .sort((left, right) => (right.mtime ?? 0) - (left.mtime ?? 0))
    .slice(0, limit);
}

export function collectRootNotebookFiles(nodes: NotebookTreeNode[]): NotebookTreeNode[] {
  return nodes;
}

export function filterNotebookTreeNodes(nodes: NotebookTreeNode[], query: string): NotebookTreeNode[] {
  if (!query.trim()) return nodes;
  const lowered = query.trim().toLowerCase();
  return nodes.filter((node) => node.path.toLowerCase().includes(lowered));
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-sidebar-state.test.ts
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/notebook/notebook-sidebar-state.ts \
  frontend/src/components/workspace/notebook/notebook-sidebar-state.test.ts \
  frontend/src/components/workspace/notebook/notebook-sidebar.tsx
git commit -F - <<'EOF'
Isolate notebook sidebar derivation logic before styling

The donor sidebar adds search and recency, which should be expressed as pure data helpers
instead of ad-hoc JSX conditionals inside the pane component.

Constraint: No new state-management library for notebook sidebar behavior
Rejected: Compute recency and filtering inline in JSX | harder to test and easier to regress
Confidence: high
Scope-risk: narrow
Directive: Keep derived notebook sidebar state in pure helpers so donor UI changes stay cheap
Tested: cd frontend && node --test src/components/workspace/notebook/notebook-sidebar-state.test.ts
Not-tested: rendered sidebar visuals
EOF
```

## Task 3: Implement The Donor-Style Sidebar On Real Notebook Data

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-sidebar.tsx`
- Create: `frontend/src/components/workspace/notebook/notebook-tree-view.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Test: `frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookSidebar exposes search, quick capture, recent notes, tree view, and trash action", async () => {
  const source = await readFile(new URL("./notebook-sidebar.tsx", import.meta.url), "utf8");

  assert.match(source, /query/);
  assert.match(source, /recentFiles/);
  assert.match(source, /onOpenQuickCapture/);
  assert.match(source, /NotebookTreeView/);
  assert.match(source, /pathOfNotebookTrash/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-sidebar.contract.test.ts
```

Expected: `FAIL`

**Step 3: Write minimal implementation**

Implement the sidebar with these exact props:

```tsx
type NotebookSidebarProps = {
  treeNodes: NotebookTreeNode[];
  selectedNoteId: string | null;
  recentFiles: NotebookFileEntry[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelectNote: (noteId: string | null) => void;
  onOpenCreate: () => void;
  onOpenQuickCapture: () => void;
};
```

Implementation requirements:

- top branding row: `Notebook`
- search field
- primary actions: create + quick capture
- recent list derived from `recentFiles`
- full tree view rendered by `NotebookTreeView`
- footer action that navigates to `pathOfNotebookTrash()`

**Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-sidebar.contract.test.ts
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-sidebar.tsx \
  frontend/src/components/workspace/notebook/notebook-tree-view.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx
git commit -F - <<'EOF'
Port the donor sidebar onto the real notebook route

This change translates the donor project's left rail into the existing notebook route
without replacing the tree API, route model, or desktop navigation.

Constraint: Must keep the existing notebook tree and trash route as the source of truth
Rejected: Recreate the donor sidebar with local mock notes | would break notebook-query parity
Confidence: high
Scope-risk: moderate
Directive: Sidebar affordances should come from notebook hooks, never from donor mock data
Tested: cd frontend && node --test src/components/workspace/notebook/notebook-sidebar.contract.test.ts
Not-tested: keyboard navigation polish
EOF
```

## Task 4: Rebuild The Editor Pane With Explicit Save And Markdown Preview

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-editor-pane.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Test: `frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookEditorPane exposes title editing, save state, preview toggle, and destructive actions", async () => {
  const source = await readFile(new URL("./notebook-editor-pane.tsx", import.meta.url), "utf8");

  assert.match(source, /MarkdownContent/);
  assert.match(source, /dirty/);
  assert.match(source, /onSave/);
  assert.match(source, /onOpenDelete/);
  assert.match(source, /onOpenHistory/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-editor-pane.contract.test.ts
```

Expected: `FAIL`

**Step 3: Write minimal implementation**

Implement the pane so that:

- the header shows `title`, `relative_path`, and `updated_at`
- dirty state is computed in `NotebookPage`, not inside the pane
- save remains explicit through `handleSave`
- preview uses:

```tsx
<MarkdownContent
  className="prose prose-neutral max-w-none"
  content={body}
  isLoading={false}
  rehypePlugins={[]}
/>
```

- edit/preview is a local pane toggle
- rename, move, history, save, delete stay as explicit actions

**Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-editor-pane.contract.test.ts
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-editor-pane.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx
git commit -F - <<'EOF'
Give the notebook editor a donor-style writing surface

The existing editor is functional but visually flat. This step keeps explicit save
and conflict-safe writes while moving the writing experience closer to the donor UI.

Constraint: Preserve notebook content_hash save semantics and avoid auto-save regressions
Rejected: Port donor auto-save timers directly | conflicts with the current explicit save + conflict model
Confidence: high
Scope-risk: moderate
Directive: Keep save orchestration in NotebookPage; the editor pane should stay presentational
Tested: cd frontend && node --test src/components/workspace/notebook/notebook-editor-pane.contract.test.ts
Not-tested: large-note rendering performance
EOF
```

## Task 5: Move Ask / History / Info Into A Real Right Context Panel

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Test: `frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookContextPanel exposes ask, history, and info tabs", async () => {
  const source = await readFile(new URL("./notebook-context-panel.tsx", import.meta.url), "utf8");

  assert.match(source, /ask/);
  assert.match(source, /history/);
  assert.match(source, /info/);
  assert.match(source, /onAssist/);
  assert.match(source, /onRestoreVersion/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-context-panel.contract.test.ts
```

Expected: `FAIL`

**Step 3: Write minimal implementation**

Implement `NotebookContextPanel` with these rules:

- `ask` tab shows the five existing notebook assist actions and routes them through `buildNotebookAssistPrompt(...)` + `pathOfNewThread(...)`
- `history` tab renders the current `useNotebookHistory(...)` entries inside the right rail instead of a separate full-screen mental model
- `info` tab shows only real fields currently available:
  - title
  - note id
  - relative path
  - created_at
  - updated_at
  - content hash
- remove the old right-side `Sheet` history dependence from `NotebookPage`

**Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-context-panel.contract.test.ts
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-context-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx
git commit -F - <<'EOF'
Turn notebook assist and history into a stable right context rail

The donor UI's key interaction win is that help, history, and note metadata stay
adjacent to the document instead of hiding behind separate modal flows.

Constraint: Ask Nion must keep routing through the existing thread creation flow
Rejected: Fake inline AI preview in Wave 1 | requires new backend or agent-side capability
Confidence: high
Scope-risk: moderate
Directive: Only expose info fields that exist in the real note contract; do not invent pin/tag metadata
Tested: cd frontend && node --test src/components/workspace/notebook/notebook-context-panel.contract.test.ts
Not-tested: history diff readability for large patches
EOF
```

## Task 6: Rebuild Creation, Quick Capture, And Delete Flows

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-compose.ts`
- Create: `frontend/src/components/workspace/notebook/notebook-compose.test.ts`
- Create: `frontend/src/components/workspace/notebook/notebook-create-dialog.tsx`
- Create: `frontend/src/components/workspace/notebook/notebook-quick-capture-dialog.tsx`
- Create: `frontend/src/components/workspace/notebook/notebook-delete-dialog.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Test: `frontend/src/components/workspace/notebook/notebook-compose.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { buildQuickCaptureDraft } from "./notebook-compose";

void test("buildQuickCaptureDraft uses the first non-empty line as title and defaults to inbox", () => {
  const draft = buildQuickCaptureDraft("Idea title\n\nSecond line");

  assert.equal(draft.title, "Idea title");
  assert.equal(draft.directory, "inbox");
  assert.match(draft.body, /Second line/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-compose.test.ts
```

Expected: `FAIL`

**Step 3: Write minimal implementation**

```ts
export function buildQuickCaptureDraft(raw: string) {
  const cleaned = raw.trim();
  const [firstLine] = cleaned.split("\n").filter(Boolean);
  return {
    title: (firstLine || "Quick capture").slice(0, 80),
    body: cleaned,
    directory: "inbox",
  };
}
```

Then build the three dialog components with these behaviors:

- `NotebookCreateDialog`: explicit title + optional directory + body
- `NotebookQuickCaptureDialog`: textarea-first flow, `Cmd+Enter` / `Ctrl+Enter` saves
- `NotebookDeleteDialog`: show preview title, relative path, summary, and destructive confirmation

**Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-compose.test.ts
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/notebook/notebook-compose.ts \
  frontend/src/components/workspace/notebook/notebook-compose.test.ts \
  frontend/src/components/workspace/notebook/notebook-create-dialog.tsx \
  frontend/src/components/workspace/notebook/notebook-quick-capture-dialog.tsx \
  frontend/src/components/workspace/notebook/notebook-delete-dialog.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx
git commit -F - <<'EOF'
Make notebook creation and deletion match the donor interaction model

The donor UI feels approachable because create, quick capture, and delete are shaped
as focused flows instead of raw CRUD controls. This step ports that interaction model
onto the real notebook mutations.

Constraint: Must use the existing create/update/delete notebook APIs
Rejected: Reuse the generic confirm-action dialog for note deletion | too little space for note summary and path context
Confidence: medium
Scope-risk: moderate
Directive: Quick capture defaults may be opinionated, but the note must still land in normal notebook storage
Tested: cd frontend && node --test src/components/workspace/notebook/notebook-compose.test.ts
Not-tested: whether `inbox/` should become user-configurable in Wave 2
EOF
```

## Task 7: Fix The Trash Route And Port The Donor Trash Surface

**Files:**
- Modify: `frontend/src/core/navigation/desktop-routes.ts`
- Modify: `frontend/src/core/navigation/desktop-routes.test.ts`
- Modify: `frontend/src/components/workspace/notebook-routes.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-trash-page.tsx`
- Test: `frontend/src/core/navigation/desktop-routes.test.ts`

**Step 1: Write the failing test**

Update the route test to expect the dedicated trash page:

```ts
assert.equal(pathOfNotebookTrash(), "/workspace/notebook/trash");
```

And update the notebook route contract to keep asserting the dedicated route:

```ts
assert.match(source, /\/workspace\/notebook\/trash/);
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && node --test src/core/navigation/desktop-routes.test.ts src/components/workspace/notebook-routes.test.ts
```

Expected: `FAIL` because `pathOfNotebookTrash()` still returns `/workspace/notebook?view=trash`.

**Step 3: Write minimal implementation**

Change:

```ts
export function pathOfNotebookTrash(
  extra: Record<string, string | undefined> = {},
) {
  return withQuery("/workspace/notebook/trash", extra);
}
```

Then donor-style `NotebookTrashPage` should:

- show trash hero/header
- list deleted notes as cards with summary + deleted time
- keep restore action
- drop any unsupported permanent purge workflow

**Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && node --test src/core/navigation/desktop-routes.test.ts src/components/workspace/notebook-routes.test.ts
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/core/navigation/desktop-routes.ts \
  frontend/src/core/navigation/desktop-routes.test.ts \
  frontend/src/components/workspace/notebook-routes.test.ts \
  frontend/src/components/workspace/notebook/notebook-trash-page.tsx
git commit -F - <<'EOF'
Align notebook trash routing with the dedicated trash page

The route helper and the actual app route drifted apart. Fixing that first keeps the
donor trash surface grounded in the real workspace navigation model.

Constraint: Preserve existing desktop renderer notebook route registration
Rejected: Keep the query-param trash mode and style around it | conflicts with the existing dedicated route file
Confidence: high
Scope-risk: narrow
Directive: Treat /workspace/notebook/trash as the only notebook trash route
Tested: cd frontend && node --test src/core/navigation/desktop-routes.test.ts src/components/workspace/notebook-routes.test.ts
Not-tested: browser back/forward ergonomics between notebook and trash
EOF
```

## Task 8: Localize The New Notebook Copy Surface

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-copy.contract.test.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-sidebar.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-editor-pane.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-create-dialog.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-quick-capture-dialog.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-delete-dialog.tsx`
- Test: `frontend/src/components/workspace/notebook/notebook-copy.contract.test.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { enUS } from "@/core/i18n/locales/en-US";
import { zhCN } from "@/core/i18n/locales/zh-CN";

void test("notebookPage includes donor-shell copy keys in both locales", () => {
  for (const locale of [enUS, zhCN]) {
    assert.ok(locale.notebookPage.quickCapture);
    assert.ok(locale.notebookPage.searchPlaceholder);
    assert.ok(locale.notebookPage.recentTitle);
    assert.ok(locale.notebookPage.askTab);
    assert.ok(locale.notebookPage.infoTab);
  }
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-copy.contract.test.ts
```

Expected: `FAIL` because the new keys are not in `Translations` or the locale objects.

**Step 3: Write minimal implementation**

Add the new notebook copy keys to:

- `frontend/src/core/i18n/locales/types.ts`
- `frontend/src/core/i18n/locales/en-US.ts`
- `frontend/src/core/i18n/locales/zh-CN.ts`

Required new keys:

```ts
quickCapture
quickCaptureHint
searchPlaceholder
recentTitle
treeTitle
askTab
historyTab
infoTab
preview
edit
quickCaptureSaved
infoNoteId
infoPath
infoUpdatedAt
infoCreatedAt
infoContentHash
```

**Step 4: Run test to verify it passes**

Run:

```bash
cd frontend && node --test src/components/workspace/notebook/notebook-copy.contract.test.ts
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/notebook/notebook-copy.contract.test.ts \
  frontend/src/core/i18n/locales/types.ts \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/components/workspace/notebook/notebook-sidebar.tsx \
  frontend/src/components/workspace/notebook/notebook-editor-pane.tsx \
  frontend/src/components/workspace/notebook/notebook-context-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-create-dialog.tsx \
  frontend/src/components/workspace/notebook/notebook-quick-capture-dialog.tsx \
  frontend/src/components/workspace/notebook/notebook-delete-dialog.tsx
git commit -F - <<'EOF'
Make the donor notebook shell fully locale-driven

The notebook surface is user-facing and copy-heavy. Every new donor-derived affordance
must go through the existing locale system instead of hardcoded strings.

Constraint: Follow the existing locale-driven notebook/settings patterns
Rejected: Hardcode donor copy during the refactor | would create debt immediately
Confidence: high
Scope-risk: moderate
Directive: Any future notebook surface text belongs in t.notebookPage, not inline JSX strings
Tested: cd frontend && node --test src/components/workspace/notebook/notebook-copy.contract.test.ts
Not-tested: copy tone review by product/design
EOF
```

## Task 9: Run Full Wave 1 Verification And Capture Remaining Gaps

**Files:**
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-trash-page.tsx`
- Modify: `docs/plans/2026-03-26-notebook-wave1-execution-spec.md`
- Test: `frontend/src/components/workspace/notebook-shell.contract.test.ts`
- Test: `frontend/src/components/workspace/notebook/notebook-sidebar-state.test.ts`
- Test: `frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts`
- Test: `frontend/src/components/workspace/notebook/notebook-editor-pane.contract.test.ts`
- Test: `frontend/src/components/workspace/notebook/notebook-context-panel.contract.test.ts`
- Test: `frontend/src/components/workspace/notebook/notebook-compose.test.ts`
- Test: `frontend/src/components/workspace/notebook/notebook-copy.contract.test.ts`
- Test: `frontend/src/components/workspace/notebook-routes.test.ts`
- Test: `frontend/src/core/navigation/desktop-routes.test.ts`
- Test: `frontend/src/core/notebook/api.test.ts`
- Test: `frontend/src/core/notebook/tree.test.ts`
- Test: `frontend/src/core/notebook/prompt.test.ts`
- Test: `backend/tests/test_notebook_api.py`
- Test: `backend/tests/test_notebook_service.py`
- Test: `backend/tests/test_notebook_history.py`

**Step 1: Write the failing verification note**

Add a `Wave 1 donor parity` checklist section to `docs/plans/2026-03-26-notebook-wave1-execution-spec.md` with unchecked items for:

- three-pane shell
- recent + search sidebar
- Markdown preview
- context panel tabs
- quick capture
- delete preview card
- donor-style trash page
- deferred Wave 2 features list

**Step 2: Run the full verification suite**

Run:

```bash
cd frontend && node --test \
  src/components/workspace/notebook-shell.contract.test.ts \
  src/components/workspace/notebook/notebook-sidebar-state.test.ts \
  src/components/workspace/notebook/notebook-sidebar.contract.test.ts \
  src/components/workspace/notebook/notebook-editor-pane.contract.test.ts \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/notebook/notebook-compose.test.ts \
  src/components/workspace/notebook/notebook-copy.contract.test.ts \
  src/components/workspace/notebook-routes.test.ts \
  src/core/navigation/desktop-routes.test.ts \
  src/core/notebook/api.test.ts \
  src/core/notebook/tree.test.ts \
  src/core/notebook/prompt.test.ts
pnpm --dir frontend check
cd backend && UV_LINK_MODE=copy uv run pytest \
  tests/test_notebook_api.py \
  tests/test_notebook_service.py \
  tests/test_notebook_history.py -q
```

Expected: all commands `PASS`

**Step 3: Fix whatever still fails with the smallest possible diff**

Only address:

- route drift
- notebook copy/type mismatches
- pane wiring regressions
- notebook API regressions

Do not start Wave 2 capabilities here.

**Step 4: Re-run the full verification suite**

Run the exact command block from Step 2 again.

Expected: all commands `PASS`

**Step 5: Commit**

```bash
git add \
  frontend/src/components/workspace/notebook/notebook-page.tsx \
  frontend/src/components/workspace/notebook/notebook-trash-page.tsx \
  frontend/src/components/workspace/notebook/*.tsx \
  frontend/src/components/workspace/notebook/*.test.ts \
  frontend/src/components/workspace/notebook-routes.test.ts \
  frontend/src/core/navigation/desktop-routes.ts \
  frontend/src/core/navigation/desktop-routes.test.ts \
  frontend/src/core/i18n/locales/types.ts \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  docs/plans/2026-03-26-notebook-wave1-execution-spec.md
git commit -F - <<'EOF'
Land the first donor-driven notebook shell on top of the real notebook stack

Wave 1 deliberately ports the donor UI only where the product already has stable notebook
contracts. The result should feel dramatically more usable without changing notebook storage,
history, or desktop routing semantics.

Constraint: Backend notebook APIs and history/trash behavior must remain unchanged in Wave 1
Rejected: Fold Wave 2 metadata and assist-preview work into the same lane | too much scope and risk
Confidence: medium
Scope-risk: broad
Directive: Start a new execution lane for assist preview, attachments, metadata, and folder creation after this lands
Tested: cd frontend && node --test src/components/workspace/notebook-shell.contract.test.ts src/components/workspace/notebook/notebook-sidebar-state.test.ts src/components/workspace/notebook/notebook-sidebar.contract.test.ts src/components/workspace/notebook/notebook-editor-pane.contract.test.ts src/components/workspace/notebook/notebook-context-panel.contract.test.ts src/components/workspace/notebook/notebook-compose.test.ts src/components/workspace/notebook/notebook-copy.contract.test.ts src/components/workspace/notebook-routes.test.ts src/core/navigation/desktop-routes.test.ts src/core/notebook/api.test.ts src/core/notebook/tree.test.ts src/core/notebook/prompt.test.ts && pnpm --dir frontend check; cd backend && UV_LINK_MODE=copy uv run pytest tests/test_notebook_api.py tests/test_notebook_service.py tests/test_notebook_history.py -q
Not-tested: desktop manual interaction pass inside the packaged Electron shell
EOF
```

## Deferred Wave 2 Plan Fragments

Do not execute these in the same branch as Wave 1 unless explicitly requested.

### Wave 2A: Notebook Assist Preview / Insert / Replace

**New files likely needed:**

- `frontend/src/core/notebook/assist.ts`
- `frontend/src/core/notebook/assist.test.ts`
- `frontend/src/components/workspace/notebook/notebook-assist-preview.tsx`
- `backend/app/gateway/routers/notebook_assist.py` or new routes in `backend/app/gateway/routers/notebook.py`
- backend tests for preview/apply flows

**Reason:** donor preview cards are only real if the system can generate a notebook-targeted preview payload and then apply it as a normal note mutation with history.

### Wave 2B: Attachment Upload

**New files likely needed:**

- frontend notebook attachment trigger component
- frontend notebook attachment API client/hook
- backend notebook attachment upload endpoint
- backend attachment tests using `NotebookService.note_attachment_dir(...)`

**Reason:** the backend already knows where note-local assets belong, but the notebook route does not yet expose file upload.

### Wave 2C: Pinned / Tags / Rich Info Metadata

**New files likely needed:**

- notebook frontmatter expansion in backend notebook models/service
- frontend notebook metadata API/types
- locale copy additions for pins/tags/info

**Reason:** donor info/pinned sections need real persisted metadata, not client-only decoration.

### Wave 2D: Folder Creation And Notebook Search

**New files likely needed:**

- backend folder creation API or safe helper endpoint
- frontend create-folder dialog
- notebook search helper or backend endpoint depending scale

**Reason:** donor affordances feel natural, but Nion should not fake them without a first-class directory/search contract.

## Final Execution Notes

- Implement Wave 1 only in the first execution lane.
- Keep every task reversible.
- Prefer extraction and reuse over fresh abstractions.
- If a donor behavior conflicts with a real notebook contract, keep the notebook contract and restyle the UI around it.
- Do not touch `desktop/src/main/*` or Electron main-process code in Wave 1 unless a route or renderer registration test proves it is required.
