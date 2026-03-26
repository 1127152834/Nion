import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge manager does not mark running when no adapters are startable", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const candidates = startableAdapters\(\)/);
  assert.match(source, /if \(candidates\.length === 0\)/);
  assert.match(source, /running = false/);
});
