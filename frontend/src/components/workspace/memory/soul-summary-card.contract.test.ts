import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("soul summary card explains current soul and relation-oriented identity", async () => {
  const source = await readFile(
    new URL("./soul-summary-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Current Soul|当前的我/);
  assert.match(source, /relationship/i);
  assert.match(source, /identity/i);
  assert.match(source, /当前关系姿态/);
  assert.match(source, /当前长期基线/);
  assert.match(source, /我正在变成什么样/);
});
