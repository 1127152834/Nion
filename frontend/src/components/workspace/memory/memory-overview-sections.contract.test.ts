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
});
