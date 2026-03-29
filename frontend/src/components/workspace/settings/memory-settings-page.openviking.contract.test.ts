import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page exposes embedded openviking notebook controls", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /useReindexNotebookResources/);
  assert.match(source, /useNotebookResourceSearch/);
  assert.match(source, /重新索引笔记|Reindex notebook/);
  assert.match(source, /搜索笔记资源|Search notebook resources/);
  assert.match(source, /source_relative_path|heading_path|snippet/);
});
