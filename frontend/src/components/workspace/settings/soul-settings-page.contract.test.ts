import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("soul settings page uses markdown preview plus whole-document edit", async () => {
  const source = await readFile(
    new URL("./soul-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /SOUL\.md/);
  assert.match(source, /预览/);
  assert.match(source, /编辑/);
  assert.match(source, /MarkdownDocumentEditor|保存并生效/);
  assert.doesNotMatch(source, /每块一个保存按钮/);
});
