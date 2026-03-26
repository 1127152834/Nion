import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop bridge base adapter supports consumeOne and send", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/base-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export type BridgeInboundMessage/);
  assert.match(source, /export type BridgeOutboundMessage/);
  assert.match(source, /abstract consumeOne\(\): Promise<BridgeInboundMessage \| null>/);
  assert.match(source, /abstract send\(message: BridgeOutboundMessage\): Promise<void>/);
});
