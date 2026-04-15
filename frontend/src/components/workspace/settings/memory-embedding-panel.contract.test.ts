import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory embedding panel is status-only and does not expose retrieval configuration", async () => {
  const source = await readFile(
    new URL("./memory-embedding-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /检索增强状态/);
  assert.match(source, /retrieval_status\.detail/);
  assert.match(source, /index_health\.detail/);
  assert.match(source, /前往模型管理中的检索模型|跳转到模型管理/);
  assert.match(source, /useMemorySettings/);
  assert.doesNotMatch(source, /保存接口配置|重建记忆索引|接口配置/);
  assert.doesNotMatch(source, /接口地址|模型名|API Key|向量维度/);
  assert.doesNotMatch(source, /usePatchMemorySettings|useRebuildMemoryVectorIndex/);
  assert.doesNotMatch(source, /custom_compatible/);
  assert.doesNotMatch(source, /一键准备|切回本地|useDownloadMemoryEmbeddingAssets/);
  assert.doesNotMatch(source, /vector_path|artifact_count|downloadMemoryEmbeddingAssets|remote_config/);
});
