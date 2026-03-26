import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookContextPanel exposes ask, history, and info tabs", async () => {
  const source = await readFile(new URL("./notebook-context-panel.tsx", import.meta.url), "utf8");

  assert.match(source, /"ask"/);
  assert.match(source, /"history"/);
  assert.match(source, /"info"/);
  assert.match(source, /onAssist/);
  assert.match(source, /onRestoreVersion/);
});
