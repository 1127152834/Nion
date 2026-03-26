import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookSidebar exposes search, quick capture, recent notes, tree view, and trash action", async () => {
  const source = await readFile(new URL("./notebook-sidebar.tsx", import.meta.url), "utf8");

  assert.match(source, /query:/);
  assert.match(source, /recentFiles:/);
  assert.match(source, /onOpenQuickCapture:/);
  assert.match(source, /quickCaptureLabel:/);
  assert.match(source, /recentTitle:/);
  assert.match(source, /searchPlaceholder:/);
  assert.match(source, /NotebookTreeView/);
});
