import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookEditorPane matches the reference writing-pane structure", async () => {
  const source = await readFile(new URL("./notebook-editor-pane.tsx", import.meta.url), "utf8");

  assert.match(source, /MarkdownContent/);
  assert.match(source, /saveState/);
  assert.match(source, /CheckCircle2/);
  assert.match(source, /MoreHorizontal/);
  assert.match(source, /Folder/);
  assert.match(source, /Clock/);
  assert.match(source, /onOpenDelete/);
  assert.match(source, /onOpenHistory/);
  assert.match(source, /previewMode/);
  assert.match(source, /min-h-\[500px\]/);
});
