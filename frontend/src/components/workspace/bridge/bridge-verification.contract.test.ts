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
  assert.match(source, /disabled=\{starting \|\| !bridgeEnabled \|\| !channelEnabled \|\| !connectionVerified\}/);
});

void test("platform enable cards expose verification-gated toggles", async () => {
  const source = await readFile(
    new URL("./bridge-shared.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /verified: boolean/);
  assert.match(source, /verificationHint/);
  assert.match(source, /disabled=\{saving \|\| !verified\}/);
});

void test("telegram bridge section auto-verifies before enabling", async () => {
  const source = await readFile(
    new URL("./TelegramBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ensureTelegramVerifiedBeforeEnable/);
  assert.match(source, /await ensureTelegramVerifiedBeforeEnable\(\)/);
});

void test("feishu bridge section auto-verifies before enabling", async () => {
  const source = await readFile(
    new URL("./FeishuBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ensureFeishuVerifiedBeforeEnable/);
  assert.match(source, /await ensureFeishuVerifiedBeforeEnable\(\)/);
});

void test("discord bridge section auto-verifies before enabling", async () => {
  const source = await readFile(
    new URL("./DiscordBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ensureDiscordVerifiedBeforeEnable/);
  assert.match(source, /await ensureDiscordVerifiedBeforeEnable\(\)/);
});

void test("qq bridge section auto-verifies before enabling", async () => {
  const source = await readFile(
    new URL("./QqBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /ensureQqVerifiedBeforeEnable/);
  assert.match(source, /await ensureQqVerifiedBeforeEnable\(\)/);
});

void test("weixin bridge section requires a verified account before enabling", async () => {
  const source = await readFile(
    new URL("./WeixinBridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /weixinConnectionVerified/);
  assert.match(source, /ensureWeixinVerifiedBeforeEnable/);
  assert.match(source, /await ensureWeixinVerifiedBeforeEnable\(\)/);
});
