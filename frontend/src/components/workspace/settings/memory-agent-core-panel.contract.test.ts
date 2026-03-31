import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory agent core panel is reduced to a supporting self-maintenance summary", async () => {
  const source = await readFile(
    new URL("./memory-agent-core-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Self-Maintenance|自我维护|runSelfMaintenance/);
  assert.match(source, /pathOfSelfMaintenance|href=\{pathOfSelfMaintenance\(\)\}/);
  assert.match(source, /summary|entry_path|last_run/i);
  assert.doesNotMatch(source, /runPlaceholder|runButton|Input/);
  assert.doesNotMatch(source, /memoryUpdates|pruneProposals|actionProposals|selfUpgradeProposals/);
  assert.doesNotMatch(source, /OpenViking|重新索引笔记|搜索笔记资源/);
});
