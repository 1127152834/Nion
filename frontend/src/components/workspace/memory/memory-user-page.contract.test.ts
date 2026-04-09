import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory user page is read-only and uses conversation-based correction", async () => {
  const source = await readFile(
    new URL("./memory-user-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /修正/);
  assert.doesNotMatch(source, /冻结/);
  assert.doesNotMatch(source, /申请遗忘|遗忘/);
  assert.doesNotMatch(source, /拒绝/);
  assert.match(source, /这条记错了|别再记这个/);
});
