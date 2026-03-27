import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookTrashPage matches the reference trash surface structure", async () => {
  const source = await readFile(new URL("./notebook-trash-page.tsx", import.meta.url), "utf8");

  assert.match(source, /Trash2/);
  assert.match(source, /restoreDeleted|copy\.restoreDeleted/);
  assert.match(source, /原路径/);
  assert.match(source, /回收站为空/);
});
