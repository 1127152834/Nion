import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookEditorPane matches the reference writing-pane structure", async () => {
  const source = await readFile(new URL("./notebook-editor-pane.tsx", import.meta.url), "utf8");

  assert.match(source, /MarkdownContent/);
  assert.match(source, /saveState/);
  assert.match(source, /pendingRewrite/);
  assert.match(source, /onConfirmPendingRewrite/);
  assert.match(source, /onCancelPendingRewrite/);
  assert.match(source, /确认/);
  assert.match(source, /取消/);
  assert.match(source, /待确认|pending rewrite/i);
  assert.match(source, /CheckCircle2/);
  assert.match(source, /MoreHorizontal/);
  assert.match(source, /DropdownMenu/);
  assert.match(source, /DropdownMenuItem/);
  assert.match(source, /重命名|copy\.rename/);
  assert.match(source, /Folder/);
  assert.match(source, /onOpenDelete/);
  assert.match(source, /onOpenHistory/);
  assert.match(source, /onSendToKnowledge/);
  assert.match(source, /onOpenKnowledgeStatus/);
  assert.match(source, /knowledgeQueueLabel/);
  assert.match(source, /knowledgeStatusLabel/);
  assert.match(source, /onOpenRename/);
  assert.match(source, /onSelectionChange/);
  assert.match(source, /selectionStart/);
  assert.match(source, /previewMode/);
  assert.match(source, /min-h-\[500px\]/);
  assert.match(source, /const showEditorHeader = .*isDraft/);
  assert.match(source, /showEditorHeader \? \(/);
  assert.doesNotMatch(source, /!note && !isDraft \? \(\s*<div className="space-y-1">/);
  assert.doesNotMatch(source, /lastEditedPrefix/);
  assert.doesNotMatch(source, /formatLastEdited/);
  assert.doesNotMatch(source, /Clock/);
});
