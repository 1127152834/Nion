import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookTreeView exposes folder management actions", async () => {
  const source = await readFile(new URL("./notebook-tree-view.tsx", import.meta.url), "utf8");

  assert.match(source, /DropdownMenu/);
  assert.match(source, /createNoteHere/);
  assert.match(source, /createSubfolder/);
  assert.match(source, /renameFolder/);
  assert.match(source, /deleteFolder/);
  assert.match(source, /renameNote/);
  assert.match(source, /moveNote/);
  assert.match(source, /deleteNote/);
  assert.match(source, /onCreateNoteInDirectory/);
  assert.match(source, /onCreateSubfolder/);
  assert.match(source, /onRenameDirectory/);
  assert.match(source, /onDeleteDirectory/);
  assert.match(source, /onRenameNote/);
  assert.match(source, /onMoveNote/);
  assert.match(source, /onDeleteNote/);
});
