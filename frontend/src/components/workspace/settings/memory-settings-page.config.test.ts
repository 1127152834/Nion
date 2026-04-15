import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page no longer owns retrieval model configuration", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /MemoryEmbeddingPanel/);
  assert.match(source, /检索增强状态/);
  assert.match(source, /前往模型管理中的检索模型/);
  assert.match(source, /goToSection\("models"\)/);
  assert.doesNotMatch(source, /memory-console-panel|MemoryConsolePanel/);
  assert.doesNotMatch(source, /fingerprint|vector_path|artifact_count/);
  assert.doesNotMatch(source, /endpoint|API Key|向量维度|保存接口配置/);
  assert.doesNotMatch(source, /remote_config|usePatchMemorySettings|useRebuildMemoryVectorIndex/);
  assert.doesNotMatch(source, /Memory OS|legacy `memory\.json`|治理链路|自动成长边界|只保留用户真正需要的入口/);
});

void test("settings dialog registers identity as a first-class settings surface", async () => {
  const source = await readFile(new URL("./settings-dialog.tsx", import.meta.url), "utf8");

  assert.match(source, /IdentitySettingsPage/);
  assert.match(source, /label:\s*t\.settings\.sections\.identity/);
});
