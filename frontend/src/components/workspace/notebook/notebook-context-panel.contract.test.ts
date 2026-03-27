import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookContextPanel matches the reference collaboration rail structure", async () => {
  const source = await readFile(new URL("./notebook-context-panel.tsx", import.meta.url), "utf8");

  assert.match(source, /"ask"/);
  assert.match(source, /"history"/);
  assert.match(source, /"info"/);
  assert.match(source, /aiPreview/);
  assert.match(source, /historyPreview/);
  assert.match(source, /handleApplyPreview/);
  assert.match(source, /handleImportFromChat/);
  assert.match(source, /useNotebookImportSources/);
  assert.match(source, /previewAssist\.isPending|applyAssist\.isPending/);
  assert.match(source, /importError|assistError|生成失败|导入失败/);
  assert.match(source, /原文片段/);
  assert.match(source, /rewriteTone|expansionIntent/);
  assert.match(source, /带当前选中继续聊|带当前结果继续聊|带整篇笔记继续聊/);
  assert.match(source, /onStartConversation/);
  assert.match(source, /tags/);
  assert.match(source, /collapsed: boolean/);
  assert.match(source, /rounded-\[1\.5rem\]/);
  assert.match(source, /onToggleCollapse/);
});
