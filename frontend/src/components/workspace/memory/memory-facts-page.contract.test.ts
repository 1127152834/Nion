import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory facts page owns fact management plus import export and cleanup actions", async () => {
  const source = await readFile(
    new URL("./memory-facts-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useMemoryFactsSurface/);
  assert.match(source, /onCreateFact|handleCreateFact|addFact/);
  assert.match(source, /onEditFact|handleEditFact|editFact/);
  assert.match(source, /onDeleteFact|handleDeleteFact|deleteMemoryFact/);
  assert.match(source, /useImportMemory|importMemory/);
  assert.match(source, /useClearMemory|clearMemory/);
  assert.match(source, /MemoryClearFlow/);
  assert.match(source, /importAction|exportAction|manageCleanup/);
  assert.doesNotMatch(source, /useMemory\(\)/);
  assert.doesNotMatch(source, /markdown\.work|markdown\.recentMonths/);
});
