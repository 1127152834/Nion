import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory embedding panel prioritizes local setup and hides api fields behind advanced disclosure", async () => {
  const source = await readFile(
    new URL("./memory-embedding-panel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /先把本地向量模型准备好|一键准备|重建索引/);
  assert.match(source, /API 模型接入|只有你明确知道自己在接统一远端 embedding 服务时/);
  assert.match(source, /RemoteModeCard|advancedOpen|download_status\.progress/);
  assert.match(source, /usePatchMemorySettings|useDownloadMemoryEmbeddingAssets|useRebuildMemoryVectorIndex/);
  assert.doesNotMatch(source, /custom_compatible/);
  assert.doesNotMatch(source, /只读展示 current provider mode/);
  assert.doesNotMatch(source, /vector_path|artifact_count/);
});
