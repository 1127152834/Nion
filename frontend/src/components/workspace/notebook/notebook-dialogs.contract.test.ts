import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("Notebook dialogs match the reference create / quick capture / delete structures", async () => {
  const createSource = await readFile(new URL("./notebook-create-dialog.tsx", import.meta.url), "utf8");
  const quickSource = await readFile(new URL("./notebook-quick-capture-dialog.tsx", import.meta.url), "utf8");
  const deleteSource = await readFile(new URL("./notebook-delete-dialog.tsx", import.meta.url), "utf8");

  assert.match(createSource, /位置/);
  assert.match(createSource, /FileText/);
  assert.match(quickSource, /Cmd\+Enter|Ctrl\+Enter/);
  assert.match(quickSource, /Zap|Sparkles/);
  assert.match(deleteSource, /AlertTriangle/);
  assert.match(deleteSource, /恢复/);
  assert.match(deleteSource, /summary|content|路径/);
});
