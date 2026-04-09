import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation job detail page explains agent-owned automation constraints", async () => {
  const source = await readFile(
    new URL("./automation-job-detail-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /owner_type === "agent"/);
  assert.match(source, /Agent 创建的自动化任务/);
  assert.match(source, /mutability === "pause_only"|编辑权限/);
  assert.match(source, /provenance_memory_id/);
  assert.match(source, /provenance_learning_id/);
  assert.match(source, /来源记忆/);
  assert.match(source, /来源学习主题/);
  assert.match(source, /编辑权限/);
  assert.match(source, /来源灵魂|soul/i);
});
