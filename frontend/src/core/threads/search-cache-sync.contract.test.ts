import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

void test("thread stream updates the threads search cache while messages are streaming", () => {
  const source = fs.readFileSync(
    new URL("./hooks.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /function updateThreadSearchCacheEntry/);
  assert.match(source, /const updateThreadSearchCache = useCallback/);
  assert.match(source, /eventType === "messages-tuple"/);
  assert.match(source, /updateThreadSearchCache\(\(thread\) => \(\{/);
  assert.match(source, /updated_at: new Date\(\)\.toISOString\(\)/);
  assert.match(source, /messages: merged/);
});
