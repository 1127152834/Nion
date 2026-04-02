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
  assert.match(source, /border-l-4|border-l-\[3px\]/);
  assert.doesNotMatch(source, /bg-foreground text-background/);
  assert.doesNotMatch(source, /rounded-2xl|rounded-full/);
});
