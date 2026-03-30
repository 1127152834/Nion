import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookContextPanel matches the reference collaboration rail structure", async () => {
  const source = await readFile(new URL("./notebook-context-panel.tsx", import.meta.url), "utf8");

  assert.match(source, /"ask"/);
  assert.match(source, /"history"/);
  assert.match(source, /"info"/);
  assert.match(source, /historyPreview/);
  assert.match(source, /handleTagSubmit|handleRemoveTag/);
  assert.match(source, /onKeyDown/);
  assert.match(source, /hover:opacity-100|group-hover:opacity-100/);
  assert.match(source, /summarizeNotebookHistoryEntry/);
  assert.doesNotMatch(source, /编辑<\/button>/);
  assert.match(source, /NotebookAssistantPanel/);
  assert.doesNotMatch(source, /aiPreview/);
  assert.match(source, /tags/);
  assert.match(source, /collapsed: boolean/);
  assert.match(source, /rounded-\[1\.5rem\]/);
  assert.match(source, /onToggleCollapse/);
});
