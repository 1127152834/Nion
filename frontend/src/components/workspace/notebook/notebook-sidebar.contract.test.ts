import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookSidebar matches the reference left-rail structure", async () => {
  const source = await readFile(new URL("./notebook-sidebar.tsx", import.meta.url), "utf8");

  assert.match(source, /createFolder:/);
  assert.match(source, /createNoteHere:/);
  assert.match(source, /createSubfolder:/);
  assert.match(source, /renameFolder:/);
  assert.match(source, /deleteFolder:/);
  assert.match(source, /query:/);
  assert.match(source, /recentNotes:/);
  assert.match(source, /onOpenQuickCapture:/);
  assert.match(source, /quickCaptureLabel:/);
  assert.match(source, /recentTitle:/);
  assert.match(source, /searchPlaceholder:/);
  assert.match(source, /pinnedNotes/);
  assert.match(source, /deletedCount/);
  assert.match(source, /MoreHorizontal/);
  assert.match(source, /Nion Notebook/);
  assert.match(source, /NotebookTreeView/);
  assert.match(source, /flex-1 min-h-0 overflow-y-auto/);
  assert.match(source, /onOpenCreateInDirectory/);
  assert.match(source, /onOpenCreateSubfolder/);
  assert.match(source, /onOpenRenameDirectory/);
  assert.match(source, /onOpenDeleteDirectory/);
  assert.match(source, /border-t border-\[var\(--notebook-border\)\]/);
  assert.match(source, /bg-\[var\(--notebook-sidebar\)\]/);
  assert.match(source, /copy\.trashTitle/);
});
