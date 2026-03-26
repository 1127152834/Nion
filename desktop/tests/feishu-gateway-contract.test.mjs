import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop feishu gateway contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/feishu/gateway.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /import \* as lark from "@larksuiteoapi\/node-sdk"/);
  assert.match(source, /export class FeishuGateway/);
  assert.match(source, /getRestClient/);
  assert.match(source, /start\(\)/);
  assert.match(source, /stop\(\)/);
});
