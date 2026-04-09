import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory growth panel no longer treats legacy growth facade as canonical source of truth", async () => {
  const source = await readFile(
    new URL("./memory-growth-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useMemoryGrowthV2/);
  assert.doesNotMatch(source, /useMemoryGrowth\(\)/);
});

void test("soul proposal list reads canonical v2 proposal hooks", async () => {
  const source = await readFile(
    new URL("./soul-proposal-list.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useSoulProposalsV2/);
  assert.match(source, /useAcceptSoulProposalV2/);
  assert.match(source, /useRejectSoulProposalV2/);
});
