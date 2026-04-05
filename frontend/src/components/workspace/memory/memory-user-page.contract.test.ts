import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory user page focuses on user context content only", async () => {
  const source = await readFile(
    new URL("./memory-user-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /markdown\.work|markdown\.personal|markdown\.topOfMind/);
  assert.match(source, /useCorrectUserModelItem/);
  assert.match(source, /useFreezeUserModelItem/);
  assert.match(source, /useForgetUserModelItem/);
  assert.match(source, /useRejectUserModelItem/);
  assert.match(source, /修正/);
  assert.match(source, /冻结/);
  assert.match(source, /申请遗忘/);
  assert.match(source, /拒绝/);
  assert.match(source, /真实记录/);
  assert.match(source, /legacy 映射/);
  assert.match(source, /disabled=\{!card\.isActionable\}/);
  assert.doesNotMatch(source, /MemoryConsolePanel/);
  assert.doesNotMatch(source, /markdown\.recentMonths/);
});
