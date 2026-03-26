import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("workspace bridge route renders the new BridgeLayout shell", async () => {
  const routeSource = await readFile(
    new URL("../../../app/workspace/bridge/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /import \{ BridgeLayout \} from/);
  assert.match(routeSource, /<BridgeLayout \/>/);
});

void test("bridge layout exposes the CodePilot-style section switcher", async () => {
  const source = await readFile(
    new URL("./BridgeLayout.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /type Section = "bridge" \| "telegram" \| "feishu" \| "discord" \| "qq" \| "weixin"/);
  assert.match(source, /BridgeSection/);
  assert.match(source, /TelegramBridgeSection/);
  assert.match(source, /FeishuBridgeSection/);
  assert.match(source, /DiscordBridgeSection/);
  assert.match(source, /QqBridgeSection/);
  assert.match(source, /WeixinBridgeSection/);
  assert.doesNotMatch(source, /ChannelSettingsPage/);
});
