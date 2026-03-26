import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("feishu gateway exposes a message handler registration hook", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/feishu/gateway.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /registerMessageHandler/);
});

test("feishu adapter wires gateway input through the inbound parser into its queue", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/adapters/feishu-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /parseFeishuInboundMessage/);
  assert.match(source, /registerMessageHandler/);
  assert.match(source, /this\.inbox\.push/);
});
