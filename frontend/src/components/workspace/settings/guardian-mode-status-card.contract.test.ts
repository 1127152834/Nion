import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("daemon settings page reframes daemon surface as guardian mode status", async () => {
  const source = await readFile(
    new URL("./daemon-settings-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /const \{ snapshot, refresh \} = useGuardianRuntime\(\);/,
  );
  assert.match(
    source,
    /<GuardianModeStatusCard[\s\S]*copy=\{guardianStatusCopy\}[\s\S]*status=\{snapshot\.guardianStatus\}[\s\S]*\/>/,
  );
  assert.match(source, /title=\{t\.settings\.daemon\.guardianTitle\}/);
  assert.match(source, /description=\{t\.settings\.daemon\.guardianDescription\}/);
  assert.match(source, /t\.settings\.daemon\.guardianBackgroundLabel/);
  assert.match(source, /t\.settings\.daemon\.guardianBackgroundHint/);
  assert.match(source, /if \(saved\) {\s*void refresh\(\);/);
  assert.match(source, /useGuardianRuntime/);
  assert.doesNotMatch(source, /getDesktopRuntimeInfo\(/);
  assert.doesNotMatch(source, /runtimeInfo\?\.guardianMode\.status/);
  assert.doesNotMatch(source, /const \[guardianStatus, setGuardianStatus\]/);
  assert.doesNotMatch(source, /loadGuardianStatus/);
  assert.doesNotMatch(source, /useEffect\(/);
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
  assert.match(source, /copy: GuardianModeStatusCardCopy/);
  assert.match(source, /copy\.title/);
  assert.match(source, /copy\.descriptions\[status\]/);
  assert.match(source, /copy\.labels\[status\]/);
});

void test("desktop runtime helper merges bridge runtime info with daemon guardian status", async () => {
  const source = await readFile(
    new URL("../../../core/api/desktop-client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /desktopBridge\?\.getRuntimeInfo/);
  assert.match(source, /fetch\(`\$\{baseUrl\}\/api\/daemon\/runtime-info`\)/);
  assert.match(source, /resolveGuardianDesktopRuntime/);
  assert.match(source, /daemonRuntime: daemonRuntimeInfo/);
  assert.match(source, /bridgeRuntime: null/);
});
