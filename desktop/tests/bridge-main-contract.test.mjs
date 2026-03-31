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

test("desktop main persists the currently tested bridge credentials before marking verification success", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.verifyTelegram/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.verifyFeishu/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.verifyDiscord/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.verifyQq/);
  assert.match(source, /updateBridgeSettings\(\(next\) => \{/);
  assert.match(source, /next\.bridge_telegram_bot_token = botToken/);
  assert.match(source, /next\.bridge_feishu_app_id = appId/);
  assert.match(source, /next\.bridge_discord_bot_token = botToken/);
  assert.match(source, /next\.bridge_qq_app_id = appId/);
});
