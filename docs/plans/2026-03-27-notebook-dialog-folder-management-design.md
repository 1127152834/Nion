# Notebook Dialog And Folder Management Design

## Goal

Fix the current notebook creation flow so it works for ordinary users instead of exposing file-path thinking.

This design addresses three concrete problems:

1. Dialogs render duplicate close buttons.
2. The create-note dialog asks users to type a directory/path string.
3. The notebook module lacks an obvious way to create and manage notebook folders.

## Product Principles

- Users manage notes and folders, not filesystem paths.
- Quick capture should optimize for speed, not organization.
- Folder management should live in the notebook tree where people already browse content.
- Do not ship folder CRUD UI without matching backend operations.

## Current State

The frontend currently has custom close buttons inside both notebook dialogs:

- [notebook-create-dialog.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-create-dialog.tsx)
- [notebook-quick-capture-dialog.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/workspace/notebook/notebook-quick-capture-dialog.tsx)

At the same time, the shared dialog primitive already renders its own top-right close button by default:

- [dialog.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/frontend/src/components/ui/dialog.tsx)

On the backend, note creation and note move already auto-create parent folders:

- [service.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/notebook-parity-reset/backend/packages/harness/nion/notebook/service.py)

However, there is no standalone folder create / rename / delete API yet.

## Decision 1: One Close Button Per Dialog

Notebook dialogs that use a custom header must disable the shared dialog primitive close button.

Rule:

- If the dialog header is custom, use `showCloseButton={false}` on `DialogContent`.
- Render exactly one close button inside the header.

This keeps the notebook dialogs aligned with the reference layout while preserving the shared dialog primitive for simpler dialogs elsewhere.

## Decision 2: Replace "Location" Path Input With A Folder Picker

The create-note dialog must stop asking for a raw directory string.

### New field model

- `标题`
- `保存到`
- `内容`

### `保存到` behavior

- Use a folder picker, not a free-text input.
- Present existing notebook folders from the notebook tree.
- Show folders in human-readable hierarchy form, for example:
  - `收件箱`
  - `工作 / Alpha`
  - `生活 / 阅读`
- Default selection:
  - current folder if the dialog was opened from a folder context
  - otherwise `收件箱`

### Copy changes

- Replace `位置` with `保存到`
- Replace any placeholder like `例如 projects/alpha` with human UI copy like `选择一个目录`

Users should never need to know or type repository-like path strings.

## Decision 3: Quick Capture Should Not Behave Like File Creation

Quick capture is for dumping information fast.

### Quick capture model

- One textarea
- One primary action
- One close button
- Shortcut hint retained

### Destination behavior

- Save to `收件箱` by default
- Display destination as a passive chip or helper line, for example:
  - `将保存到：收件箱`
- Optional secondary action:
  - `更改目录`
  - opens the same folder picker if the user explicitly wants it

Quick capture should not ask for title or folder selection upfront.

## Decision 4: Add Explicit Folder Management In The Sidebar Tree

Users need to organize their notebook with folders, so folder creation must exist as a first-class action.

### Recommended entry points

1. `所有笔记` section header
   - add a small `新建目录` action

2. Folder row hover / context menu
   - `在此新建笔记`
   - `新建子目录`
   - `重命名目录`
   - `删除目录`

3. Note more-actions / move dialog
   - `移动到...`

### Deletion rule

- v1 should only allow deleting empty folders
- if a folder contains notes or subfolders, block deletion and explain why

This gives users a real organization model without introducing a separate "folder management page".

## Backend Requirements

### Already available

- folder tree read via notebook tree
- create note into a directory
- move note into a directory

### Required to ship full folder UX

1. `POST /api/notebook/directories`
   - create empty folder
   - input:
     - `parent_directory`
     - `name`

2. `POST /api/notebook/directories/rename`
   - rename folder
   - input:
     - `directory`
     - `name`

3. `POST /api/notebook/directories/delete`
   - delete empty folder only
   - input:
     - `directory`

If we want a smaller first release, we can ship only `create directory` first and defer rename/delete.

## Recommended Delivery Order

### Phase 1

- Remove duplicate close buttons
- Rename `位置` to `保存到`
- Replace free-text path with folder picker
- Keep quick capture defaulted to `收件箱`

### Phase 2

- Add `新建目录` in the sidebar tree
- Add folder row context menu actions
- Add backend create-directory API

### Phase 3

- Add rename/delete-empty-folder flows

## What To Avoid

- Raw path input in user-facing dialogs
- Two close buttons in the same dialog
- Quick capture with too many fields
- Folder CRUD UI without backend support
- Exposing words like `directory`, `relative path`, or `filesystem` to normal users

## Final Recommendation

The notebook should behave like a document knowledge base:

- users choose folders visually
- users create folders from the sidebar tree
- quick capture always lands in inbox first
- note creation is structured but simple

This is the smallest model that feels natural for ordinary users and still fits the current notebook architecture.
