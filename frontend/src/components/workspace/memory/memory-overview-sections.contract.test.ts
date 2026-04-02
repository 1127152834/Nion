import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory overview cards expose summary-first presentation with detail actions", async () => {
  const source = await readFile(
    new URL("./memory-overview-sections.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /查看详情/);
  assert.doesNotMatch(source, /\(空\)/);
  assert.match(source, /min-h-\[214px\]/);
  assert.match(source, /border-t/);
  assert.match(source, /justify-between/);
  assert.match(source, /text-xs text-muted-foreground/);
  assert.match(source, /flex-1 text-sm leading-7/);
  assert.match(source, /rounded-md|rounded-lg/);
  assert.doesNotMatch(source, /rounded-2xl/);
});
