import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop main wires bridge IPC handlers to bridge stores", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /createBridgeSettingsStore/);
  assert.match(source, /createBridgeBindingsStore/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.getSettings/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.saveSettings/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.getStatus/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.listBindings/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.startPlatform/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.stopPlatform/);
});
