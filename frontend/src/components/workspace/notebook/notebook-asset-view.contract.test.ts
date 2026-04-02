import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("NotebookAssetView renders notebook-scoped asset preview metadata", async () => {
  const source = await readFile(new URL("./notebook-asset-view.tsx", import.meta.url), "utf8");

  assert.match(source, /export function NotebookAssetView/);
  assert.match(source, /mime_type|mimeType/);
  assert.match(source, /relative_path|relativePath/);
  assert.match(source, /source_kind|sourceKind/);
  assert.match(source, /iframe|pre|img/);
});
