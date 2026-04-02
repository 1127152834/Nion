import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory page excludes notebook semantics and focuses on memory operations", async () => {
  const source = await readFile(
    new URL("./memory-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useMemory\(/);
  assert.match(source, /useClearMemory\(/);
  assert.match(source, /useDeleteMemoryFact\(/);
  assert.match(source, /MemoryMapNav/);
  assert.match(source, /MemorySummaryCards/);
  assert.match(source, /MemoryOverviewSections/);
  assert.match(source, /MemoryDetailDrawer/);
  assert.match(source, /xl:grid-cols-\[190px_minmax\(0,1fr\)_340px\]/);
  assert.doesNotMatch(source, /useRunMemoryCompaction/);
  assert.doesNotMatch(source, /useRunMemoryRebuild/);
  assert.doesNotMatch(source, /t\.settings\.compaction\.title/);
  assert.doesNotMatch(source, /t\.settings\.rebuild\.title/);
  assert.doesNotMatch(source, /Notebook|Knowledge Base|reindex notebook/i);
  assert.doesNotMatch(source, /MemoryAgentCorePanel|selfMaintenance/i);
  assert.doesNotMatch(source, /variant="destructive"[\s\S]*clearAll/);
  assert.doesNotMatch(source, /MemoryDangerZone/);
  assert.doesNotMatch(source, /rounded-2xl/);
  assert.match(source, /MemoryDetailInspector/);
});
