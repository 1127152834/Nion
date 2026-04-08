import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readSource(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

void test("memory embedding panel exposes three provider modes and status fields", async () => {
  const panelSource = await readSource("./memory-embedding-panel.tsx");
  const apiSource = await readSource("../../../core/memory-settings/api.ts");
  const hookSource = await readSource("../../../core/memory-settings/hooks.ts");
  const typesSource = await readSource("../../../core/memory-settings/types.ts");
  const pageSource = await readSource("./memory-settings-page.tsx");

  assert.match(panelSource, /本机推荐/);
  assert.match(panelSource, /云端增强/);
  assert.match(panelSource, /高级自定义/);
  assert.match(panelSource, /current provider mode|当前 provider 模式|provider mode/i);
  assert.match(panelSource, /download status|下载状态/i);
  assert.match(panelSource, /active fingerprint|fingerprint/i);
  assert.match(panelSource, /index health|索引健康/i);
  assert.match(panelSource, /useMemorySettings/);

  assert.match(typesSource, /export interface MemorySettingsMode/);
  assert.match(typesSource, /export interface MemorySettingsDownloadStatus/);
  assert.match(typesSource, /export interface MemorySettingsFingerprint/);
  assert.match(typesSource, /export interface MemorySettingsIndexHealth/);
  assert.match(typesSource, /export interface MemorySettingsResponse/);

  assert.match(apiSource, /export async function loadMemorySettings/);
  assert.match(apiSource, /\/api\/memory\/settings/);
  assert.doesNotMatch(apiSource, /method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);

  assert.match(hookSource, /export function useMemorySettings/);
  assert.match(hookSource, /useQuery/);
  assert.match(hookSource, /queryKey:\s*\["memory-settings"\]/);
  assert.match(hookSource, /loadMemorySettings\(\)/);
  assert.doesNotMatch(hookSource, /useMutation/);

  assert.match(pageSource, /MemoryEmbeddingPanel/);
});
