import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory search results page owns the dedicated search results experience", async () => {
  const source = await readFile(
    new URL("./memory-search-results-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useSearchParams/);
  assert.match(source, /useRecallSearch/);
  assert.match(source, /searchStructuredMemory/);
  assert.match(source, /pathOfThread/);
  assert.match(source, /filterMemory|filterHistory|historyTitle|structuredTitle/);
  assert.doesNotMatch(source, /MemoryConsolePanel|MemoryDetailInspector/);
  assert.doesNotMatch(source, /onCreateFact|onImportMemory|manageCleanup/);
});
