import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

for (const [label, file, key] of [
  ["telegram", "../src/main/bridge/adapters/telegram-adapter.ts", "bridge_telegram_enabled"],
  ["feishu", "../src/main/bridge/adapters/feishu-adapter.ts", "bridge_feishu_enabled"],
  ["discord", "../src/main/bridge/adapters/discord-adapter.ts", "bridge_discord_enabled"],
  ["qq", "../src/main/bridge/adapters/qq-adapter.ts", "bridge_qq_enabled"],
  ["weixin", "../src/main/bridge/adapters/weixin-adapter.ts", "bridge_weixin_enabled"],
] ) {
  test(`desktop ${label} bridge adapter contract exists`, () => {
    const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /extends BaseBridgeAdapter/);
    assert.match(source, new RegExp(key));
    assert.match(source, /validateConfig/);
    assert.match(source, /getStatus/);
  });
}
