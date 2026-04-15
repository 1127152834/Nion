import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("artifact file list download action uses asChild button wrapper instead of button inside anchor", async () => {
  const source = await readFile(new URL("./artifact-file-list.tsx", import.meta.url), "utf8");

  assert.match(source, /<Button variant="ghost" asChild>/);
  assert.match(source, /<a[\s\S]*target="_blank"[\s\S]*rel="noopener noreferrer"/m);
  assert.doesNotMatch(source, /<a[\s\S]*>\s*<Button variant="ghost">/m);
});
