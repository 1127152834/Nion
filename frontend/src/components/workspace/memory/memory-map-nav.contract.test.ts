import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory map nav exposes the left navigation hierarchy without large radius blocks", async () => {
  const source = await readFile(
    new URL("./memory-map-nav.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Memory map|记忆结构|Memory map nav/i);
  assert.match(source, /markdown\.userContext/);
  assert.match(source, /markdown\.historyBackground/);
  assert.match(source, /markdown\.facts/);
  assert.match(source, /h-0\.5 bg-foreground/);
  assert.match(source, /transition-\[width\]|duration-200|w-full/);
  assert.match(source, /w-0/);
  assert.doesNotMatch(source, /bg-foreground text-background/);
  assert.doesNotMatch(source, /bg-\[color:var\(--muted\)\]/);
  assert.doesNotMatch(source, /rounded-md px-3 py-2 text-left text-sm font-semibold/);
  assert.doesNotMatch(source, /rounded-md px-3 py-3 text-left text-sm/);
  assert.doesNotMatch(source, /rounded-2xl|rounded-full/);
});
