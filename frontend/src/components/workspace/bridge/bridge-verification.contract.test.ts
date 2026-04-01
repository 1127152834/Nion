import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge shared runtime card gates start behind connection verification", async () => {
  const source = await readFile(
    new URL("./bridge-shared.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /connectionVerified/);
  assert.match(source, /bridge\.errorChannelNotVerified/);
  assert.match(source, /disabled=\{starting \|\| !bridgeEnabled \|\| !connectionVerified\}/);
  assert.match(source, /if \(!channelEnabled && onEnableBeforeStart\)/);
});

void test("bridge runtime card is the single control surface for platform activation", async () => {
  const source = await readFile(
    new URL("./bridge-shared.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /export function BridgePlatformRuntimeCard/);
  assert.doesNotMatch(source, /export function BridgePlatformEnableCard/);
});

void test("telegram bridge section auto-verifies before enabling", async () => {
  const source = await readFile(
    new URL("./TelegramBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ensureTelegramVerifiedBeforeEnable/);
  assert.match(source, /await ensureTelegramVerifiedBeforeEnable\(\)/);
  assert.match(source, /useBridgeConfigEditor/);
  assert.match(source, /saveBridgeConfig/);
});

void test("feishu bridge section auto-verifies before enabling", async () => {
  const source = await readFile(
    new URL("./FeishuBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ensureFeishuVerifiedBeforeEnable/);
  assert.match(source, /await ensureFeishuVerifiedBeforeEnable\(\)/);
  assert.match(source, /saveBridgeConfig/);
});

void test("discord bridge section auto-verifies before enabling", async () => {
  const source = await readFile(
    new URL("./DiscordBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ensureDiscordVerifiedBeforeEnable/);
  assert.match(source, /await ensureDiscordVerifiedBeforeEnable\(\)/);
  assert.match(source, /saveBridgeConfig/);
});

void test("qq bridge section auto-verifies before enabling", async () => {
  const source = await readFile(
    new URL("./QqBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ensureQqVerifiedBeforeEnable/);
  assert.match(source, /await ensureQqVerifiedBeforeEnable\(\)/);
  assert.match(source, /saveBridgeConfig/);
});

void test("weixin bridge section requires a verified account before enabling", async () => {
  const source = await readFile(
    new URL("./WeixinBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const weixinConnectionVerified = accounts\.some/);
  assert.match(source, /ensureWeixinVerifiedBeforeEnable/);
  assert.match(source, /await ensureWeixinVerifiedBeforeEnable\(\)/);
});

void test("shared bridge verification helper rejects stale verified flags without required config", async () => {
  const source = await readFile(
    new URL("./bridge-shared.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /switch \(platform\)/);
  assert.match(source, /case "telegram"/);
  assert.match(source, /case "feishu"/);
  assert.match(source, /case "discord"/);
  assert.match(source, /case "qq"/);
});

void test("platform sections derive enablement from persisted verification plus current form dirtiness", async () => {
  const telegramSource = await readFile(
    new URL("./TelegramBridgeSection.tsx", import.meta.url),
    "utf8",
  );
  const feishuSource = await readFile(
    new URL("./FeishuBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(telegramSource, /const \[persistedVerified, setPersistedVerified\]/);
  assert.match(telegramSource, /const credentialsDirty =/);
  assert.match(telegramSource, /const connectionVerified = persistedVerified && !credentialsDirty && Boolean\(botToken\)/);
  assert.match(feishuSource, /const \[persistedVerified, setPersistedVerified\]/);
  assert.match(feishuSource, /const connectionVerified =/);
  assert.match(feishuSource, /credentialsDirty/);
});

void test("bridge platform sections persist config through the config editor save path instead of setState-plus-save races", async () => {
  const sources = await Promise.all([
    readFile(new URL("./TelegramBridgeSection.tsx", import.meta.url), "utf8"),
    readFile(new URL("./FeishuBridgeSection.tsx", import.meta.url), "utf8"),
    readFile(new URL("./DiscordBridgeSection.tsx", import.meta.url), "utf8"),
    readFile(new URL("./QqBridgeSection.tsx", import.meta.url), "utf8"),
    readFile(new URL("./WeixinBridgeSection.tsx", import.meta.url), "utf8"),
  ]);

  for (const source of sources) {
    assert.match(source, /saveBridgeConfig/);
  }
});

void test("bridge config editor save path rebases on the latest config center snapshot to survive verify-then-enable races", async () => {
  const source = await readFile(
    new URL("../../../core/bridge-config/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const initialBaseConfig = configEditor\.configData\?\.config/);
  assert.match(source, /normalizeBridgeConfigRoot/);
  assert.match(source, /const latestConfig = latestConfigResult\.data\?\.config/);
  assert.match(source, /const firstAttempt = await configEditor\.onSaveConfig/);
  assert.match(source, /configEditor\.onSaveConfig\(/);
});

void test("platform enable flows stop when config persistence fails after verification", async () => {
  const telegramSource = await readFile(
    new URL("./TelegramBridgeSection.tsx", import.meta.url),
    "utf8",
  );
  const discordSource = await readFile(
    new URL("./DiscordBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(telegramSource, /const saved = await saveBridgeConfig/);
  assert.match(telegramSource, /if \(!saved\) \{\s*return false;\s*\}/);
  assert.match(discordSource, /const saved = await saveBridgeConfig/);
  assert.match(discordSource, /if \(!saved\) \{\s*return false;\s*\}/);
});

void test("bridge config forms stay renderable without desktop bridge runtime", async () => {
  const telegramSource = await readFile(
    new URL("./TelegramBridgeSection.tsx", import.meta.url),
    "utf8",
  );
  const weixinSource = await readFile(
    new URL("./WeixinBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(telegramSource, /if \(!client\) \{\s*return null;\s*\}/);
  assert.match(weixinSource, /getBridgeClient/);
  assert.match(weixinSource, /if \(!client\)/);
});
