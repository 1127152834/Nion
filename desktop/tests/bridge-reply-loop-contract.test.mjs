import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge manager sends final thread output back through the adapter", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const result = await threadClient\.streamMessage/);
  assert.match(source, /deliverOutboundText/);
  assert.match(source, /deliverBridgeMessage/);
});
