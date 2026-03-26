import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readLocalSource(filename: string) {
  return readFile(new URL(filename, import.meta.url), "utf8");
}

void test("bridge section reads and writes bridge settings through the desktop bridge client", async () => {
  const source = await readLocalSource("./BridgeSection.tsx");

  assert.match(source, /createBridgeClient|getBridgeClient/);
  assert.match(source, /bridge_telegram_enabled/);
  assert.match(source, /bridge_feishu_enabled/);
  assert.match(source, /bridge_discord_enabled/);
  assert.match(source, /bridge_qq_enabled/);
  assert.match(source, /bridge_weixin_enabled/);
  assert.doesNotMatch(source, /bridge_default_work_dir/);
  assert.doesNotMatch(source, /bridge_default_model/);
  assert.doesNotMatch(source, /bridge_default_provider_id/);
});

void test("feishu section exposes credential fields through the bridge client", async () => {
  const source = await readLocalSource("./FeishuBridgeSection.tsx");

  assert.match(source, /createBridgeClient|getBridgeClient/);
  assert.match(source, /bridge_feishu_app_id/);
  assert.match(source, /bridge_feishu_app_secret/);
  assert.match(source, /bridge_feishu_domain/);
  assert.doesNotMatch(source, /bridge_feishu_dm_policy/);
  assert.doesNotMatch(source, /bridge_feishu_thread_session/);
  assert.doesNotMatch(source, /bridge_feishu_group_policy/);
});

void test("discord section exposes only the active bot credential field through the bridge client", async () => {
  const source = await readLocalSource("./DiscordBridgeSection.tsx");

  assert.match(source, /createBridgeClient|getBridgeClient/);
  assert.match(source, /bridge_discord_bot_token/);
  assert.doesNotMatch(source, /bridge_discord_allowed_users/);
  assert.doesNotMatch(source, /bridge_discord_allowed_channels/);
  assert.doesNotMatch(source, /bridge_discord_group_policy/);
});

void test("qq section exposes app credentials through the bridge client", async () => {
  const source = await readLocalSource("./QqBridgeSection.tsx");

  assert.match(source, /createBridgeClient|getBridgeClient/);
  assert.match(source, /bridge_qq_app_id/);
  assert.match(source, /bridge_qq_app_secret/);
  assert.match(source, /bridge_qq_allowed_users/);
  assert.doesNotMatch(source, /bridge_qq_max_image_size/);
});

void test("weixin section exposes account management through the bridge client", async () => {
  const source = await readLocalSource("./WeixinBridgeSection.tsx");

  assert.match(source, /listWeixinAccounts/);
  assert.match(source, /startWeixinLogin/);
  assert.match(source, /waitForWeixinLogin/);
  assert.match(source, /setWeixinAccountEnabled/);
  assert.match(source, /deleteWeixinAccount/);
});
