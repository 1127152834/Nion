import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread stream refetches thread state after end so background titles can land silently", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /if \(eventType === "end"\) \{/);
  assert.match(source, /void apiClient\s*\.getState<AgentThreadState>\(finalThreadId\)/);
  assert.match(source, /const refreshedTitle = state\.values\?\.title;/);
  assert.match(source, /updateThreadSearchCache\(\(thread\) => \(\{/);
  assert.match(source, /values:\s*\{[\s\S]*title: refreshedTitle,/s);
});
