import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookMemoryExtractDialog uses dialog shell and textarea", async () => {
  const source = await readFile(new URL("./notebook-memory-extract-dialog.tsx", import.meta.url), "utf8");

  assert.match(source, /NotebookDialogShell/);
  assert.match(source, /Textarea/);
  assert.match(source, /onSubmit/);
});
