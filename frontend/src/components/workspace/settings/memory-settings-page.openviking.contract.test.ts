import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page keeps notebook retrieval controls out of memory panels", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useSelfMaintenanceRun/);
  assert.doesNotMatch(source, /useReindexNotebookResources/);
  assert.doesNotMatch(source, /useNotebookResourceSearch/);
  assert.doesNotMatch(source, /useNotebookContextPreview/);
});
