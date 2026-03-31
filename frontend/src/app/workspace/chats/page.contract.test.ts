import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("chat list page exposes the same lightweight multi-select delete mode", async () => {
  const source = await readFile(new URL("./page.tsx", import.meta.url), "utf8");

  assert.match(source, /selectionMode/);
  assert.match(source, /selectedThreadIds/);
  assert.match(source, /toggleThreadSelection/);
  assert.match(source, /handleDeleteSelected/);
  assert.match(source, /t\.common\.select/);
  assert.match(source, /t\.common\.cancel/);
  assert.match(source, /t\.common\.delete/);
  assert.match(source, /t\.chats\.selectedCount/);
  assert.match(source, /handleSelectAll/);
  assert.match(source, /t\.common\.selectAll/);
  assert.match(source, /searchParams\.get\("type"\)/);
  assert.match(source, /groupThreadsByWorkspaceType/);
  assert.match(source, /ThreadTypeTabs/);
  assert.match(source, /scope="page"/);
  assert.match(source, /WorkspaceThreadListItem/);
  assert.match(source, /pathOfThread\(remainingThreads\[0\]\?\.thread\.thread_id \?\? "new", \{\s*type:/);
});
