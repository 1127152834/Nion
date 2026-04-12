import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread stream inserts a newly created thread into search cache before the first values snapshot lands", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /function insertThreadSearchCacheEntry/);
  assert.match(source, /const insertThreadSearchCache = useCallback/);
  assert.match(source, /onCreated: \(createdThreadId\) => \{/);
  assert.match(source, /insertThreadSearchCache\(createdThreadId\)/);
});
