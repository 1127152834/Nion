import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page mounts the real embedding control surface", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /MemoryEmbeddingPanel/);
  assert.match(source, /当前只支持外部向量模型接口|语义检索/);
  assert.doesNotMatch(source, /memory-console-panel|MemoryConsolePanel/);
  assert.doesNotMatch(source, /fingerprint|vector_path|artifact_count/);
  assert.doesNotMatch(source, /Memory OS|legacy `memory\.json`|治理链路|自动成长边界|只保留用户真正需要的入口/);
  assert.match(source, /MemoryEmbeddingPanel/);
});

void test("settings dialog registers identity as a first-class settings surface", async () => {
  const source = await readFile(new URL("./settings-dialog.tsx", import.meta.url), "utf8");

  assert.match(source, /IdentitySettingsPage/);
  assert.match(source, /label:\s*t\.settings\.sections\.identity/);
});
