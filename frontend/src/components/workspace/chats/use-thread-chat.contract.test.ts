import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test('useThreadChat ignores stale "new" route params after replaceState switches to a real thread', async () => {
  const source = await readFile(new URL("./use-thread-chat.ts", import.meta.url), "utf8");

  assert.match(source, /if \(threadIdFromPath === "new"\) \{\s*return;\s*\}/);
});
