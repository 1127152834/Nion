import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory search page owns the console, inspector, and fact management actions", async () => {
  const source = await readFile(
    new URL("./memory-search-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /MemoryConsolePanel/);
  assert.match(source, /MemoryDetailInspector/);
  assert.match(source, /onCreateFact/);
  assert.match(source, /onEditFact/);
  assert.match(source, /onExportMemory/);
  assert.match(source, /onImportMemory/);
});
