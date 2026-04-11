import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("memory settings page removes fake embedding and console surfaces", async () => {
  const source = await readFile(
    new URL("./memory-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /MemoryEmbeddingPanel/);
  assert.doesNotMatch(source, /memory-console-panel|MemoryConsolePanel/);
  assert.doesNotMatch(source, /fingerprint|vector_path|artifact_count/);
  assert.doesNotMatch(source, /Memory OS|legacy `memory\.json`|治理链路|自动成长边界/);
  assert.match(source, /打开记忆|打开 Soul|打开身份/);
});

void test("settings dialog registers identity as a first-class settings surface", async () => {
  const source = await readFile(new URL("./settings-dialog.tsx", import.meta.url), "utf8");

  assert.match(source, /IdentitySettingsPage/);
  assert.match(source, /label:\s*t\.settings\.sections\.identity/);
});
