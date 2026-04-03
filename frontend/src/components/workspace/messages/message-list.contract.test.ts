import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("message list renders internal conversation compression summaries as a compact centered tag", async () => {
  const source = await readFile(new URL("./message-list.tsx", import.meta.url), "utf8");

  assert.match(source, /group\.type === "system:internal-summary"/);
  assert.match(source, /t\.conversation\.compressedSummary/);
  assert.match(source, /justify-center/);
  assert.match(source, /rounded-full/);
});
