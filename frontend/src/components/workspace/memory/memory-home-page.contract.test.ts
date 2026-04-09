import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory home page only exposes user-facing memory content groups", async () => {
  const source = await readFile(
    new URL("./memory-home-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /用户画像|长期背景|事实记忆/);
  assert.doesNotMatch(source, /Agent Growth/);
  assert.doesNotMatch(source, /Memory ledger/);
  assert.doesNotMatch(source, /Memory evidence/);
  assert.doesNotMatch(source, /Runtime trace/);
  assert.doesNotMatch(source, /检索控制台/);
});
