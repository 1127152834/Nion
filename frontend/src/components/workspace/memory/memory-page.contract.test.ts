import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory page excludes notebook semantics and focuses on memory operations", async () => {
  const source = await readFile(
    new URL("./memory-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Memory Provider|Memory Console|Recall|Compaction|Rebuild/);
  assert.doesNotMatch(source, /Notebook|Knowledge Base|reindex notebook/i);
});
