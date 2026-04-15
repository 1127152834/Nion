import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge IPC exposes a unified runtime snapshot channel and type", () => {
  const source = fs.readFileSync(
    new URL("../src/shared/bridge-ipc.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /bridgeRuntimeInfo:\s*"bridge:get-runtime-info"/);
  assert.match(source, /export type DesktopBridgeRuntimeInfo = \{/);
  assert.match(source, /running:\s*boolean;/);
  assert.match(source, /autoStartEnabled:\s*boolean;/);
  assert.match(source, /enabledPlatforms:\s*string\[\];/);
  assert.match(source, /activeBindings:\s*number;/);
  assert.match(source, /openIncidents:\s*number;/);
  assert.match(source, /startedAt:\s*string \| null;/);
});

test("desktop main serves one bridge runtime snapshot handler", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const getBridgeRuntimeInfo = \(\) => \{/);
  assert.match(source, /const status = bridgeManager\.getStatus\(\);/);
  assert.match(
    source,
    /const activeBindings = bridgeBindingsStore[\s\S]*?listBindings\(\)[\s\S]*?filter\(\(binding\)\s*=>\s*binding\.active\)[\s\S]*?length;/,
  );
  assert.match(
    source,
    /const openIncidents = bridgeIncidentsStore\.listIncidents\(\{\s*status:\s*"open"\s*\}\)\.length;/,
  );
  assert.match(source, /running:\s*status\.running,/);
  assert.match(source, /autoStartEnabled:\s*bridgeSettingsCache\.bridge_auto_start === "true",/);
  assert.match(source, /enabledPlatforms:\s*status\.enabledPlatforms,/);
  assert.match(source, /activeBindings,/);
  assert.match(source, /openIncidents,/);
  assert.match(source, /startedAt:\s*status\.startedAt,/);
  assert.match(
    source,
    /ipcMain\.handle\(\s*DESKTOP_BRIDGE_IPC_CHANNELS\.bridgeRuntimeInfo,\s*\(\)\s*=>\s*\{\s*return getBridgeRuntimeInfo\(\);\s*\}\s*\);/,
  );

  const matches = source.match(/ipcMain\.handle\(DESKTOP_BRIDGE_IPC_CHANNELS\.bridgeRuntimeInfo/g) ?? [];
  assert.equal(matches.length, 1);
});
