import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

for (const [label, file, key] of [
  ["telegram", "../src/main/bridge/adapters/telegram-adapter.ts", "bridge_telegram_bot_token"],
  ["feishu", "../src/main/bridge/adapters/feishu-adapter.ts", "bridge_feishu_app_id"],
  ["discord", "../src/main/bridge/adapters/discord-adapter.ts", "bridge_discord_bot_token"],
  ["qq", "../src/main/bridge/adapters/qq-adapter.ts", "bridge_qq_app_id"],
  ["weixin", "../src/main/bridge/adapters/weixin-adapter.ts", "No enabled Weixin accounts"],
] ) {
  test(`desktop ${label} bridge adapter contract exists`, () => {
    const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /extends BaseBridgeAdapter/);
    assert.match(source, new RegExp(key));
    assert.match(source, /validateConfig/);
    assert.match(source, /getStatus/);
  });
}
