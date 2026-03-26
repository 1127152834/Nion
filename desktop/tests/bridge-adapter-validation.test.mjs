import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const CASES = [
  ["telegram", "../src/main/bridge/adapters/telegram-adapter.ts", "bridge_telegram_bot_token"],
  ["feishu", "../src/main/bridge/adapters/feishu-adapter.ts", "bridge_feishu_app_id"],
  ["feishu", "../src/main/bridge/adapters/feishu-adapter.ts", "bridge_feishu_app_secret"],
  ["discord", "../src/main/bridge/adapters/discord-adapter.ts", "bridge_discord_bot_token"],
  ["qq", "../src/main/bridge/adapters/qq-adapter.ts", "bridge_qq_app_id"],
  ["qq", "../src/main/bridge/adapters/qq-adapter.ts", "bridge_qq_app_secret"],
];

for (const [label, file, requiredKey] of CASES) {
  test(`${label} adapter validates required setting ${requiredKey}`, () => {
    const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, new RegExp(requiredKey));
    assert.match(source, /return ".*not configured"/);
  });
}
