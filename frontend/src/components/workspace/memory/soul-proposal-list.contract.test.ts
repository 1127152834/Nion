import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("soul proposal list exposes explainable accept and reject controls", async () => {
  const source = await readFile(
    new URL("./soul-proposal-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useSoulProposalsV2/);
  assert.match(source, /useAcceptSoulProposalV2/);
  assert.match(source, /useRejectSoulProposalV2/);
  assert.match(source, /为什么产生/);
  assert.match(source, /会改变什么/);
  assert.match(source, /接受/);
  assert.match(source, /拒绝/);
  assert.match(source, /刚刚生效|已拒绝/);
  assert.match(source, /useState/);
});
