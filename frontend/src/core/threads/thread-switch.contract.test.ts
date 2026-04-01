import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread stream replaces loaded messages when the requested thread changes", async () => {
  const source = await readFile(new URL("./hooks.ts", import.meta.url), "utf8");

  assert.match(source, /loadedStateThreadIdRef/);
  assert.match(source, /reconcileLoadedThreadMessages\(/);
  assert.match(source, /loadedThreadId: currentThreadId/);
  assert.match(source, /loadedStateThreadIdRef\.current = currentThreadId/);
});
