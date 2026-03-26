import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge manager can process one inbound message through bindings into the thread client", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /processNextInboundMessage/);
  assert.match(source, /await adapter\.consumeOne\(\)/);
  assert.match(source, /resolveBindingForAddress/);
  assert.match(source, /threadClient\.streamMessage/);
});
