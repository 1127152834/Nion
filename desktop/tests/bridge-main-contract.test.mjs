import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop main wires bridge IPC handlers to bridge stores", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /createBridgeBindingsStore/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.getSettings/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.saveSettings/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.getStatus/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.listBindings/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.startPlatform/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.stopPlatform/);
  assert.match(source, /\/api\/config/);
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
  assert.match(source, /next\.bridge_telegram_bot_token = explicitBotToken \?\? botToken/);
  assert.match(source, /next\.bridge_feishu_app_id = explicitAppId \?\? appId/);
  assert.match(source, /next\.bridge_discord_bot_token = explicitBotToken \?\? botToken/);
  assert.match(source, /next\.bridge_qq_app_id = explicitAppId \?\? appId/);
});

test("desktop main migrates legacy local bridge settings into config db", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /migrateLegacyBridgeSettings/);
  assert.match(source, /settings\.json/);
  assert.match(source, /writeBridgeConfigToConfigCenter/);
});

test("desktop main refreshes bridge settings cache from config center before starting bridge runtime", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const syncBridgeSettingsCache = async \(\) => \{/);
  assert.match(source, /bridgeSettingsCache = bridgeConfigToSettingsMap\(await readBridgeConfigFromConfigCenter\(\)\)/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.start,[\s\S]*await syncBridgeSettingsCache\(\);[\s\S]*bridgeManager\.start\(\)/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.startPlatform,[\s\S]*await syncBridgeSettingsCache\(\);[\s\S]*bridgeManager\.startPlatform\(platform\)/);
});
