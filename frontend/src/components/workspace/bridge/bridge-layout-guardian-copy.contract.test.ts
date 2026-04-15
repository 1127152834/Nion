import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge layout frames the page as a unified remote entry surface for the same guardian-mode computer", async () => {
  const layoutSource = await readFile(new URL("./BridgeLayout.tsx", import.meta.url), "utf8");
  const sharedSource = await readFile(new URL("./bridge-shared.tsx", import.meta.url), "utf8");

  assert.match(layoutSource, /title=\{t\("bridge\.title"\)\}/);
  assert.match(layoutSource, /description=\{t\("bridge\.description"\)\}/);
  assert.match(layoutSource, /t\("bridge\.summaryTitle"\)/);
  assert.match(layoutSource, /t\("bridge\.summaryDescription"\)/);
  assert.match(layoutSource, /t\("bridge\.summarySameComputer"\)/);
  assert.match(layoutSource, /t\("bridge\.summarySameTasks"\)/);
  assert.match(layoutSource, /t\("bridge\.summarySameQueue"\)/);

  assert.match(sharedSource, /"bridge\.title": "Unified Remote Entry"/);
  assert.match(
    sharedSource,
    /"bridge\.description":\s*"Manage every connected channel as one remote entry surface into the same guardian-mode computer"/,
  );
  assert.match(sharedSource, /"bridge\.summaryTitle": "One remote entry surface"/);
  assert.match(
    sharedSource,
    /"bridge\.summaryDescription":\s*"Telegram, Feishu, Discord, QQ, and WeChat all connect into the same computer, the same task execution context, and the same confirmation queue\."/,
  );
  assert.match(sharedSource, /"bridge\.summarySameComputer": "Same computer"/);
  assert.match(sharedSource, /"bridge\.summarySameTasks": "Same tasks"/);
  assert.match(sharedSource, /"bridge\.summarySameQueue": "Same confirmation queue"/);
  assert.match(sharedSource, /"bridge\.title": "统一远程入口"/);
  assert.match(
    sharedSource,
    /"bridge\.description":\s*"把所有已连接渠道作为同一台 guardian-mode 电脑的统一远程入口来管理"/,
  );
  assert.match(sharedSource, /"bridge\.summaryTitle": "所有渠道都通往同一个执行面"/);
  assert.match(
    sharedSource,
    /"bridge\.summaryDescription":\s*"无论从 Telegram、飞书、Discord、QQ 还是微信进入，最终连接的都是同一台电脑、同一组任务执行上下文，以及同一个确认队列。"/,
  );
  assert.match(sharedSource, /"bridge\.summarySameComputer": "同一台电脑"/);
  assert.match(sharedSource, /"bridge\.summarySameTasks": "同一组任务"/);
  assert.match(sharedSource, /"bridge\.summarySameQueue": "同一个确认队列"/);

  assert.match(layoutSource, /<TelegramBridgeSection \/>/);
  assert.match(layoutSource, /<FeishuBridgeSection \/>/);
  assert.match(layoutSource, /<DiscordBridgeSection \/>/);
  assert.match(layoutSource, /<QqBridgeSection \/>/);
  assert.match(layoutSource, /<WeixinBridgeSection \/>/);

  assert.doesNotMatch(sharedSource, /"bridge\.title": "Remote Bridge"/);
  assert.doesNotMatch(
    sharedSource,
    /"bridge\.description": "Control Claude through external channels such as Telegram and Feishu"/,
  );
});
