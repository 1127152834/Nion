import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation job detail page explains agent-owned automation constraints", async () => {
  const source = await readFile(
    new URL("./automation-job-detail-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /job\.owner_type === "agent"/);
  assert.match(source, /Agent 创建的自动化任务/);
});
