import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory page excludes notebook semantics and focuses on memory operations", async () => {
  const source = await readFile(
    new URL("./memory-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /t\.workspaceSurfaces\.memory\.title/);
  assert.match(source, /MemoryProviderPanel/);
  assert.match(source, /MemoryConsolePanel/);
  assert.match(source, /useRunMemoryCompaction/);
  assert.match(source, /useRunMemoryRebuild/);
  assert.match(source, /t\.settings\.compaction\.title/);
  assert.match(source, /t\.settings\.rebuild\.title/);
  assert.doesNotMatch(source, /Notebook|Knowledge Base|reindex notebook/i);
  assert.doesNotMatch(source, /MemoryAgentCorePanel|selfMaintenance/i);
});
