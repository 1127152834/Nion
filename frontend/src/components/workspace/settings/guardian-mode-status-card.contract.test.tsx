import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("daemon settings page reframes daemon surface as guardian mode status", async () => {
  const source = await readFile(
    new URL("./daemon-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /<GuardianModeStatusCard status=\{guardianStatus\} \/>/);
  assert.match(source, /title="Guardian Mode"/);
  assert.match(
    source,
    /description="Keep the desktop runtime available for remote entry and show its current guardian status\."/,
  );
  assert.match(source, /Keep guardian mode running in the background/);
  assert.match(source, /getDesktopRuntimeInfo\(/);
  assert.match(source, /runtimeInfo\?\.guardianMode\.status/);
  assert.doesNotMatch(source, /const guardianStatus = allowBackgroundRunning/);
  assert.doesNotMatch(source, /t\.settings\.daemon\.title/);
  assert.doesNotMatch(source, /t\.settings\.daemon\.description/);
  assert.doesNotMatch(source, /fetch\(`\$\{baseUrl\}\/api\/daemon\/runtime-info`\)/);
});

void test("guardian mode status card exposes the three runtime states and descriptive copy", async () => {
  const source = await readFile(
    new URL("./guardian-mode-status-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /standing_by/);
  assert.match(source, /busy/);
  assert.match(source, /offline/);
  assert.match(source, /Guardian mode/);
});

void test("desktop runtime helper merges bridge runtime info with daemon guardian status", async () => {
  const source = await readFile(
    new URL("../../../core/api/desktop-client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /desktopBridge\?\.getRuntimeInfo/);
  assert.match(source, /fetch\(`\$\{baseUrl\}\/api\/daemon\/runtime-info`\)/);
  assert.match(source, /guardianMode:/);
  assert.match(source, /bridgeRuntime:/);
  assert.match(source, /guardian_mode\?\.\s*status/);
});
