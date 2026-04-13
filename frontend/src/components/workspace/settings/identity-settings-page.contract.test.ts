import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("identity settings page uses markdown preview plus whole-document edit", async () => {
  const source = await readFile(
    new URL("./identity-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /IDENTITY\.md/);
  assert.match(source, /预览/);
  assert.match(source, /编辑/);
  assert.match(source, /MarkdownDocumentEditor|保存并生效/);
  assert.doesNotMatch(source, /常用别名[\s\S]*保存[\s\S]*用户角色[\s\S]*保存/);
});
