import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory growth panel exposes status-aware growth governance controls", async () => {
  const source = await readFile(
    new URL("./memory-growth-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useMemoryGrowthV2/);
  assert.match(source, /useFreezeMemoryGrowthItemV2/);
  assert.match(source, /useRejectMemoryGrowthItemV2/);
  assert.match(source, /useAcceptMemoryGrowthItemV2/);
  assert.match(source, /useResumeMemoryGrowthItemV2/);
  assert.match(source, /接受/);
  assert.match(source, /冻结/);
  assert.match(source, /恢复/);
  assert.match(source, /拒绝/);
  assert.match(source, /候选中/);
  assert.match(source, /已生效/);
  assert.match(source, /已冻结/);
  assert.match(source, /已拒绝/);
  assert.match(source, /SoulProposalList/);
  assert.match(source, /SoulGrowthTimeline/);
});
