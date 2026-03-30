import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory agent core panel owns autodream and self-maintenance tools", async () => {
  const source = await readFile(
    new URL("./memory-agent-core-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutoDream|梦境日志|runAutoDream/);
  assert.doesNotMatch(source, /OpenViking|重新索引笔记|搜索笔记资源/);
});
