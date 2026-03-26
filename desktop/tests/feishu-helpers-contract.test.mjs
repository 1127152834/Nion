import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop feishu inbound parser contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/feishu/inbound.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export function parseFeishuInboundMessage/);
  assert.match(source, /chat_id/);
  assert.match(source, /message_id/);
});

test("desktop feishu outbound helper contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/feishu/outbound.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export async function sendFeishuMessage/);
  assert.match(source, /client\.im\.message\.create/);
});
