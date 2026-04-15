import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("knowledge page reader is read-only and source-traceable", async () => {
  const source = await readFile(
    new URL("./knowledge-page-reader.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useI18n/);
  assert.match(source, /t\.knowledgePage\.page/);
  assert.match(source, /copy\.sources/);
  assert.match(source, /copy\.compiled/);
  assert.match(source, /copy\.revisionRequest/);
  assert.doesNotMatch(source, /Textarea|contentEditable|onChange=\{/);
});
