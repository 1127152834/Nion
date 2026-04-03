import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory home page is overview-only and does not embed the old workbench", async () => {
  const source = await readFile(
    new URL("./memory-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /MemorySummaryCards/);
  assert.doesNotMatch(source, /MemoryConsolePanel/);
  assert.doesNotMatch(source, /MemoryDetailInspector/);
  assert.doesNotMatch(source, /factDialogOpen/);
});
