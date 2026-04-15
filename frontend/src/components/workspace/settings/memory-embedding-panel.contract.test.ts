import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory embedding panel is remote-only and centers external embedding configuration", async () => {
  const source = await readFile(
    new URL("./memory-embedding-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /外部向量模型接口|保存接口配置|重建记忆索引/);
  assert.match(source, /接口地址|模型名|API Key|向量维度/);
  assert.match(source, /usePatchMemorySettings|useRebuildMemoryVectorIndex/);
  assert.doesNotMatch(source, /custom_compatible/);
  assert.doesNotMatch(source, /一键准备|切回本地|useDownloadMemoryEmbeddingAssets/);
  assert.doesNotMatch(source, /vector_path|artifact_count|downloadMemoryEmbeddingAssets/);
});
