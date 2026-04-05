import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory growth panel exposes minimal freeze and reject controls", async () => {
  const source = await readFile(
    new URL("./memory-growth-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useFreezeMemoryGrowthItem/);
  assert.match(source, /useRejectMemoryGrowthItem/);
  assert.match(source, /useAcceptMemoryGrowthItem/);
  assert.match(source, /useResumeMemoryGrowthItem/);
  assert.match(source, /接受/);
  assert.match(source, /冻结/);
  assert.match(source, /恢复/);
  assert.match(source, /拒绝/);
});
