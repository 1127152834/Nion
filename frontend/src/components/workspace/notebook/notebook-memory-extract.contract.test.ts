import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("notebook page wires extract-to-memory dialog into the note workflow", async () => {
  const source = await readFile(new URL("./notebook-page.tsx", import.meta.url), "utf8");

  assert.match(source, /useExtractNotebookMemory/);
  assert.match(source, /NotebookMemoryExtractDialog/);
  assert.match(source, /extractToMemory/);
});
