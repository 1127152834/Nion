import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop bridge shared status type includes adapter details", () => {
  const source = fs.readFileSync(
    new URL("../src/shared/bridge-ipc.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /adapters: DesktopBridgeAdapterStatus\[]/);
  assert.match(source, /export type DesktopBridgeAdapterStatus/);
});

test("bridge manager computes adapter status list", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /adapters: resolveAdapters\(\)\.map/);
});
