# Notebook V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the next shippable Notebook V1 slice: correct dialog semantics, folder-based organization, inbox-first quick capture, and first-class folder creation in the notebook tree.

**Architecture:** Reuse the existing notebook tree as the source of truth for folder selection, add explicit backend folder lifecycle APIs, then refactor create / move / quick-capture flows to use a shared folder-picker surface instead of raw path inputs. Keep the scope product-correct but narrow: folders become user-facing destinations and organization nodes, while notebook remains separate from agent memory and diary.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + TanStack Query + shadcn/Radix UI + cmdk + FastAPI + Pydantic + Python service layer + `node:test` + `pytest`

---

## Scope

This plan implements the blueprint and dialog/folder-management spec from:

- [2026-03-27-notebook-v1-product-blueprint.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/docs/plans/2026-03-27-notebook-v1-product-blueprint.md)
- [2026-03-27-notebook-dialog-folder-management-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/docs/plans/2026-03-27-notebook-dialog-folder-management-design.md)

## Non-Goals

- backlinks / graph UI
- attachment UX
- notebook search redesign
- cloud sync
- notebook replacing agent memory

## Commit Discipline

Every commit in this plan must use the repo's Lore Commit Protocol.
Do not use plain one-line `feat:` commits.

Use this skeleton for each commit:

```bash
git commit -m "Allow notebook folders to be managed directly" \
  -m "Constraint: Notebook V1 must stop exposing raw path inputs to ordinary users" \
  -m "Confidence: medium" \
  -m "Scope-risk: moderate" \
  -m "Directive: Keep folder UX notebook-native; do not reintroduce filesystem copy in dialogs" \
  -m "Tested: <exact command>" \
  -m "Not-tested: Desktop visual QA"
```

## Verification Commands

Backend:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_service.py tests/test_notebook_api.py -q
```

Frontend targeted tests:

```bash
node --test \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/*.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/api.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/directories.test.ts
```

Frontend typecheck:

```bash
pnpm --dir /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend typecheck
```

---

### Task 1: Add Backend Folder Lifecycle APIs

**Files:**
- Modify: `backend/packages/harness/nion/notebook/service.py`
- Modify: `backend/app/gateway/routers/notebook.py`
- Modify: `backend/tests/test_notebook_service.py`
- Modify: `backend/tests/test_notebook_api.py`

**Step 1: Write failing service tests for folder lifecycle**

Add service tests for:

```python
def test_create_directory_creates_empty_folder(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    created = service.create_directory(parent_directory="projects", name="alpha")
    assert created == "projects/alpha"
    assert (tmp_path / "notebook" / "projects" / "alpha").is_dir()

def test_rename_directory_moves_visible_folder(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    service.create_directory(parent_directory="", name="projects")
    service.create_directory(parent_directory="projects", name="alpha")
    renamed = service.rename_directory(directory="projects/alpha", name="beta")
    assert renamed == "projects/beta"

def test_delete_directory_rejects_non_empty_folder(tmp_path):
    service = NotebookService(base_dir=tmp_path)
    service.create_note(directory="projects/alpha", title="Roadmap", body="v1")
    with pytest.raises(NotebookError):
        service.delete_directory("projects/alpha")
```

**Step 2: Run backend tests to verify failure**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_service.py -q
```

Expected: FAIL because `NotebookService` does not yet expose `create_directory`, `rename_directory`, or `delete_directory`.

**Step 3: Implement minimal service methods and explicit errors**

Add to `service.py`:

- `NotebookDirectoryNotFoundError`
- `NotebookDirectoryNotEmptyError`
- `create_directory(parent_directory: str, name: str) -> str`
- `rename_directory(directory: str, name: str) -> str`
- `delete_directory(directory: str) -> None`

Rules:

- reject traversal and hidden paths by reusing `_resolve_directory`
- allow only visible notebook folders
- deleting root is invalid
- deleting non-empty folders raises `NotebookDirectoryNotEmptyError`
- rename keeps subtree contents intact

**Step 4: Add API routes and route tests**

Add route models in `notebook.py`:

```python
class NotebookDirectoryCreateRequest(BaseModel):
    parent_directory: str = ""
    name: str

class NotebookDirectoryRenameRequest(BaseModel):
    directory: str
    name: str

class NotebookDirectoryDeleteRequest(BaseModel):
    directory: str
```

Add routes:

- `POST /api/notebook/directories`
- `POST /api/notebook/directories/rename`
- `POST /api/notebook/directories/delete`

Add API tests covering:

- create folder shows up in `/tree`
- rename updates directory path in `/tree`
- delete empty folder removes it from `/tree`
- delete non-empty folder returns `409`

**Step 5: Run backend verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_service.py tests/test_notebook_api.py -q
```

Expected: PASS

**Step 6: Commit**

```bash
git add \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend/packages/harness/nion/notebook/service.py \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend/app/gateway/routers/notebook.py \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend/tests/test_notebook_service.py \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend/tests/test_notebook_api.py
```

Commit with Lore protocol.

---

### Task 2: Extend Frontend Notebook Data Contracts For Folder Ops

**Files:**
- Modify: `frontend/src/core/notebook/types.ts`
- Modify: `frontend/src/core/notebook/api.ts`
- Modify: `frontend/src/core/notebook/hooks.ts`
- Modify: `frontend/src/core/notebook/index.ts`
- Modify: `frontend/src/core/notebook/api.test.ts`

**Step 1: Write failing API tests**

Add tests in `api.test.ts` for:

```ts
await createNotebookDirectory({ parent_directory: "projects", name: "alpha" });
await renameNotebookDirectory({ directory: "projects/alpha", name: "beta" });
await deleteNotebookDirectory({ directory: "projects/beta" });
```

Assert correct endpoints and payloads:

- `POST /api/notebook/directories`
- `POST /api/notebook/directories/rename`
- `POST /api/notebook/directories/delete`

**Step 2: Run API tests to verify failure**

Run:

```bash
node --test /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/api.test.ts
```

Expected: FAIL because those frontend helpers do not exist yet.

**Step 3: Implement frontend contract additions**

Add types:

```ts
export interface NotebookDirectoryCreateInput {
  parent_directory: string;
  name: string;
}

export interface NotebookDirectoryRenameInput {
  directory: string;
  name: string;
}

export interface NotebookDirectoryDeleteInput {
  directory: string;
}
```

Add API helpers and mutation hooks:

- `createNotebookDirectory`
- `renameNotebookDirectory`
- `deleteNotebookDirectory`
- `useCreateNotebookDirectory`
- `useRenameNotebookDirectory`
- `useDeleteNotebookDirectory`

Invalidate at least:

- `["notebook", "tree"]`
- `["notebook", "notes"]`

**Step 4: Re-run API tests and typecheck**

Run:

```bash
node --test /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/api.test.ts
pnpm --dir /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/types.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/api.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/hooks.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/index.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/api.test.ts
```

Commit with Lore protocol.

---

### Task 3: Add Pure Folder-Option Helpers And A Shared Folder Picker

**Files:**
- Create: `frontend/src/core/notebook/directories.ts`
- Create: `frontend/src/core/notebook/directories.test.ts`
- Modify: `frontend/src/core/notebook/index.ts`
- Create: `frontend/src/components/workspace/notebook/notebook-folder-picker.tsx`

**Step 1: Write helper tests first**

Create `directories.test.ts` for pure logic:

```ts
void test("buildNotebookDirectoryOptions always includes inbox first", () => {
  const options = buildNotebookDirectoryOptions([
    { path: "projects", name: "projects", depth: 1, child_count: 1, mtime: null },
    { path: "projects/alpha", name: "alpha", depth: 2, child_count: 0, mtime: null },
  ]);

  assert.equal(options[0]?.path, "inbox");
  assert.equal(options[1]?.label, "projects");
  assert.equal(options[2]?.label, "projects / alpha");
});
```

**Step 2: Run helper test to verify failure**

Run:

```bash
node --test /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/directories.test.ts
```

Expected: FAIL because the helper file does not exist.

**Step 3: Implement reusable helpers and picker**

In `directories.ts`, add:

- `NotebookDirectoryOption`
- `buildNotebookDirectoryOptions(entries)`
- `findDefaultNotebookDirectory({ selectedNotePath, preferredDirectory })`
- `formatNotebookDirectoryLabel(path)`

In `notebook-folder-picker.tsx`, build a reusable folder picker using the existing `Command` primitives in:

- `frontend/src/components/ui/command.tsx`

The picker should:

- open a searchable list of folders
- display human labels like `工作 / Alpha`
- return the raw directory path string on selection
- support `收件箱`

**Step 4: Run helper test and typecheck**

Run:

```bash
node --test /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/directories.test.ts
pnpm --dir /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/directories.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/directories.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/index.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-folder-picker.tsx
```

Commit with Lore protocol.

---

### Task 4: Refactor Create-Note Dialog To Use Folder Selection Instead Of Path Input

**Files:**
- Modify: `frontend/src/components/workspace/notebook/notebook-create-dialog.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-copy.contract.test.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

**Step 1: Update contract tests first**

Change dialog contract expectations from raw location input to notebook language:

```ts
assert.match(createSource, /保存到|Save to/);
assert.match(createSource, /showCloseButton=\{false\}/);
assert.match(createSource, /NotebookFolderPicker/);
assert.doesNotMatch(createSource, /目录，例如 projects\\/alpha/);
```

Also add copy assertions for new locale keys:

- `saveToLabel`
- `inboxLabel`
- `selectFolderPlaceholder`

**Step 2: Run frontend tests to verify failure**

Run:

```bash
node --test \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-copy.contract.test.ts
```

Expected: FAIL because the dialog still renders `位置` and duplicate close buttons.

**Step 3: Implement create-dialog refactor**

Requirements:

- pass `showCloseButton={false}` to `DialogContent`
- keep one custom close button in the header
- replace `位置` input with `NotebookFolderPicker`
- rename label to `保存到`
- default to:
  - selected note's parent folder when available
  - otherwise `inbox`

The dialog props should evolve from raw path-entry behavior toward:

```ts
type NotebookCreateDialogProps = {
  directory: string;
  directoryOptions: NotebookDirectoryOption[];
  onDirectoryChange: (value: string) => void;
  ...
}
```

**Step 4: Re-run tests and typecheck**

Run:

```bash
node --test \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-copy.contract.test.ts
pnpm --dir /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-create-dialog.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-page.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-copy.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/types.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/zh-CN.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/en-US.ts
```

Commit with Lore protocol.

---

### Task 5: Simplify Quick Capture To Inbox-First Semantics

**Files:**
- Modify: `frontend/src/components/workspace/notebook/notebook-quick-capture-dialog.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-compose.ts`
- Modify: `frontend/src/components/workspace/notebook/notebook-compose.test.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

**Step 1: Add/adjust tests for inbox-first quick capture**

Tests should lock:

- exactly one close button
- `Cmd+Enter` hint preserved
- visible helper like `保存到：收件箱`
- quick capture draft still defaults to `directory: "inbox"`

**Step 2: Run quick-capture tests to verify failure**

Run:

```bash
node --test \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-compose.test.ts
```

Expected: FAIL until the new helper line and close-button semantics are implemented.

**Step 3: Implement quick-capture refactor**

Requirements:

- set `showCloseButton={false}` on `DialogContent`
- keep one custom close button in the header
- keep one textarea only
- display passive destination helper:

```tsx
<span>将保存到：{copy.inboxLabel}</span>
```

- do not add title input
- do not add mandatory folder picker

**Step 4: Re-run tests and typecheck**

Run:

```bash
node --test \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-compose.test.ts
pnpm --dir /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-quick-capture-dialog.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-compose.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-compose.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/types.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/zh-CN.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/en-US.ts
```

Commit with Lore protocol.

---

### Task 6: Add Folder Creation / Rename / Delete UI In The Sidebar Tree

**Files:**
- Create: `frontend/src/components/workspace/notebook/notebook-folder-dialog.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-sidebar.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-tree-view.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts`
- Create: `frontend/src/components/workspace/notebook/notebook-tree-view.contract.test.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

**Step 1: Write contract tests for folder actions**

Lock:

- sidebar section header exposes `新建目录`
- tree view directory rows expose menu actions:
  - `在此新建笔记`
  - `新建子目录`
  - `重命名目录`
  - `删除目录`

Suggested contract assertions:

```ts
assert.match(source, /新建目录|Create folder/);
assert.match(treeSource, /DropdownMenu/);
assert.match(treeSource, /新建子目录|Create subfolder/);
assert.match(treeSource, /删除目录|Delete folder/);
```

**Step 2: Run contract tests to verify failure**

Run:

```bash
node --test \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-tree-view.contract.test.ts
```

Expected: FAIL because the folder action surfaces do not exist yet.

**Step 3: Implement sidebar folder-management wiring**

Build:

- `NotebookFolderDialog` for create / rename / delete-empty confirmation
- header-level `新建目录`
- folder row menu using existing `DropdownMenu`
- page-level state in `notebook-page.tsx` to drive create/rename/delete folder actions

Behavior rules:

- creating a folder from the header creates a top-level folder
- creating a subfolder seeds `parent_directory`
- deleting a non-empty folder shows backend error toast
- do not add a separate folder-management page

**Step 4: Verify folder-management UI**

Run:

```bash
node --test \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-tree-view.contract.test.ts
pnpm --dir /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-folder-dialog.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-sidebar.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-tree-view.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-page.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-tree-view.contract.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/types.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/zh-CN.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/i18n/locales/en-US.ts
```

Commit with Lore protocol.

---

### Task 7: Replace Raw Move-Path Input With The Shared Folder Picker

**Files:**
- Modify: `frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-editor-pane.tsx`
- Modify: `frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts`

**Step 1: Add a failing contract check**

Lock the move flow away from raw path input:

```ts
assert.match(pageSource, /NotebookFolderPicker/);
assert.doesNotMatch(pageSource, /moveValue.*placeholder=.*projects\\/archive/);
```

**Step 2: Run targeted contract tests to verify failure**

Run:

```bash
node --test /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts
```

Expected: FAIL because move still uses a plain `Input`.

**Step 3: Refactor move dialog**

Requirements:

- use the same folder picker as create-note
- default to the current note folder
- keep move action notebook-native:
  - no raw path copy
  - no filesystem wording

If needed, rename `moveValue` to `moveDirectory`.

**Step 4: Re-run tests and typecheck**

Run:

```bash
node --test /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts
pnpm --dir /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-page.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-editor-pane.tsx \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts
```

Commit with Lore protocol.

---

### Task 8: Final Regression Sweep

**Files:**
- Verify only; no planned new files

**Step 1: Run full notebook frontend tests**

Run:

```bash
node --test \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/*.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/api.test.ts \
  /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/core/notebook/directories.test.ts
```

Expected: PASS

**Step 2: Run backend notebook tests**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend
UV_LINK_MODE=copy uv run pytest tests/test_notebook_service.py tests/test_notebook_api.py -q
```

Expected: PASS

**Step 3: Run frontend typecheck**

Run:

```bash
pnpm --dir /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend typecheck
```

Expected: PASS

**Step 4: Manual QA checklist**

Verify manually in desktop:

- create dialog shows one close button only
- create dialog says `保存到`, not `位置`
- create dialog uses folder picker
- quick capture shows inbox-first helper
- sidebar has `新建目录`
- folder row supports subfolder / rename / delete
- moving a note uses folder picker, not free-text path input
- deleting a non-empty folder fails with a user-readable message

**Step 5: Final commit**

```bash
git add -A
```

Commit with Lore protocol referencing all final verification commands.

---

## Execution Notes

- Keep the implementation in `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset`
- Do not add new dependencies.
- Reuse existing `DialogContent.showCloseButton`, `Command`, and `DropdownMenu` primitives.
- Keep raw filesystem vocabulary out of user-facing copy.
- Do not mix notebook content rules with agent memory rules.

Plan complete and saved to `docs/plans/2026-03-27-notebook-v1-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
