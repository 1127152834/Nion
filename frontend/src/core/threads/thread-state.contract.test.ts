import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("thread-state merge preserves optimistic human file metadata when the server snapshot omits files", async () => {
  const source = await readFile(new URL("./thread-state.ts", import.meta.url), "utf8");

  assert.match(source, /function mergeMessagePreservingLocalFiles/);
  assert.match(source, /incoming\.type !== "human"/);
  assert.match(source, /files: existingFiles/);
  assert.match(source, /mergeMessagePreservingLocalFiles\(/);
});
