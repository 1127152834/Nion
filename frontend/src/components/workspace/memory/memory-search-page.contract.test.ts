import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory search page is a minimal search entry that routes into dedicated results", async () => {
  const source = await readFile(
    new URL("./memory-search-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useRouter/);
  assert.match(source, /pathOfMemorySearchResults/);
  assert.match(source, /router\.push\(pathOfMemorySearchResults/);
  assert.doesNotMatch(source, /MemoryConsolePanel/);
  assert.doesNotMatch(source, /MemoryDetailInspector/);
  assert.doesNotMatch(source, /onCreateFact|onEditFact|onExportMemory|onImportMemory/);
  assert.doesNotMatch(source, /useRecallSearch/);
});
