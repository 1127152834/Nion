import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation job list page visibly distinguishes agent-owned jobs", async () => {
  const source = await readFile(
    new URL("./automation-job-list-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /job\.owner_type === "agent"/);
  assert.match(source, /Agent/);
  assert.match(source, /用户创建/);
  assert.match(source, /Agent 创建/);
});
