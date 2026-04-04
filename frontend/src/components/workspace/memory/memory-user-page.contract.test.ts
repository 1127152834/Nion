import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory user page focuses on user context content only", async () => {
  const source = await readFile(
    new URL("./memory-user-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /markdown\.work|markdown\.personal|markdown\.topOfMind/);
  assert.match(source, /useFreezeUserModelItem/);
  assert.match(source, /冻结/);
  assert.doesNotMatch(source, /MemoryConsolePanel/);
  assert.doesNotMatch(source, /markdown\.recentMonths/);
});
