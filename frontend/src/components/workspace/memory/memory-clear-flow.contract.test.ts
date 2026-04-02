import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory clear flow requires three-step confirmation affordances", async () => {
  const source = await readFile(
    new URL("./memory-clear-flow.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /step === 1/);
  assert.match(source, /step === 2/);
  assert.match(source, /step === 3/);
  assert.match(source, /清空记忆|clear memory/i);
  assert.match(source, /countdown|倒计时/i);
  assert.doesNotMatch(source, /t\.common\.cancel/);
});
