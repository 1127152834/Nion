import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory embedding panel exposes real mode selection and rebuild actions", async () => {
  const source = await readFile(
    new URL("./memory-embedding-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /本地模式|远端模式/);
  assert.match(source, /重建索引|下载模型|切换模式/);
  assert.match(source, /usePatchMemorySettings|useDownloadMemoryEmbeddingAssets|useRebuildMemoryVectorIndex/);
  assert.doesNotMatch(source, /custom_compatible/);
  assert.doesNotMatch(source, /只读展示 current provider mode/);
  assert.doesNotMatch(source, /vector_path|artifact_count/);
});
