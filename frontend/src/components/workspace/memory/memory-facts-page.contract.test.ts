import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory facts page focuses on fact management only", async () => {
  const source = await readFile(
    new URL("./memory-facts-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /onCreateFact|handleCreateFact|addFact/);
  assert.match(source, /onEditFact|handleEditFact|editFact/);
  assert.match(source, /onDeleteFact|handleDeleteFact|deleteMemoryFact/);
  assert.doesNotMatch(source, /markdown\.work|markdown\.recentMonths/);
});
