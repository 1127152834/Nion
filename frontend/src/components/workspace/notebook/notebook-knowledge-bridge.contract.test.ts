import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("notebook surfaces expose send-to-knowledge and knowledge-status actions without embedding a knowledge editor", async () => {
  const inboxSource = await readFile(
    new URL("./notebook-inbox-panel.tsx", import.meta.url),
    "utf8",
  );
  const editorSource = await readFile(
    new URL("./notebook-editor-pane.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = await readFile(
    new URL("./notebook-page.tsx", import.meta.url),
    "utf8",
  );

  for (const source of [inboxSource, editorSource]) {
    assert.match(source, /知识队列|Knowledge/);
    assert.doesNotMatch(source, /overview\.md|graph\.json|sources\//);
  }

  assert.match(pageSource, /知识库编译状态/);
  assert.match(pageSource, /knowledgeCompileStatus/);
  assert.match(pageSource, /打开生成页面/);
  assert.match(pageSource, /重试编译/);
  assert.match(pageSource, /createdPageIds/);
});
