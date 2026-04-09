import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("soul page exposes stable settings instead of governance console metadata", async () => {
  const source = await readFile(
    new URL("./soul-console-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /核心人格|说话方式|价值观|关系基调/);
  assert.match(source, /草稿|应用/);
  assert.doesNotMatch(source, /revision/i);
  assert.doesNotMatch(source, /evidence_ref/i);
  assert.doesNotMatch(source, /rollback/i);
  assert.doesNotMatch(source, /冻结自动演化/);
});
