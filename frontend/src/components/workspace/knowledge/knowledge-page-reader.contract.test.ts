import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge page reader is read-only and source-traceable", async () => {
  const source = await readFile(
    new URL("./knowledge-page-reader.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /sources/i);
  assert.match(source, /compiled/i);
  assert.match(source, /revision/i);
  assert.doesNotMatch(source, /Textarea|contentEditable|onChange=\{/);
});
