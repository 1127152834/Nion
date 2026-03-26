import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookEditorPane exposes title editing, save state, preview toggle, and destructive actions", async () => {
  const source = await readFile(new URL("./notebook-editor-pane.tsx", import.meta.url), "utf8");

  assert.match(source, /MarkdownContent/);
  assert.match(source, /dirty/);
  assert.match(source, /onSave/);
  assert.match(source, /onOpenDelete/);
  assert.match(source, /onOpenHistory/);
  assert.match(source, /previewMode/);
});
