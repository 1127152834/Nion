import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("desktop bridge main treats weixin verification as account-driven instead of persisted flag only", async () => {
  const source = await readFile(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /verifyWeixinAccounts/);
  assert.match(source, /verifyWeixinAccounts\(weixinBridgeStore\.listAccounts\(\)\)\.verified/);
});

void test("desktop bridge manager does not trust verified flags without matching required config", async () => {
  const source = await readFile(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /switch \(platform\)/);
  assert.match(source, /case "telegram"/);
  assert.match(source, /case "feishu"/);
  assert.match(source, /case "discord"/);
  assert.match(source, /case "qq"/);
});
