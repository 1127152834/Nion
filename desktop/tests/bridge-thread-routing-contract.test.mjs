import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge manager wires channel router and nion thread client", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /createBridgeChannelRouter/);
  assert.match(source, /createNionThreadClient/);
});
