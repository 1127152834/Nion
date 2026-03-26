import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge manager defines a background adapter loop", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const runAdapterLoop = async/);
  assert.match(source, /while \(running\)/);
  assert.match(source, /loopTasks = new Map/);
  assert.match(source, /runAdapterLoop\(adapter\)/);
});
