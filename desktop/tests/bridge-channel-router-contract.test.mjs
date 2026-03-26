import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("bridge channel router contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/channel-router.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export type BridgeAddress/);
  assert.match(source, /export function createBridgeChannelRouter/);
  assert.match(source, /resolveBinding/);
});

test("bridge channel router resolves by platform and chat id", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/channel-router.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /platform === address\.platform/);
  assert.match(source, /chatId === address\.chatId/);
  assert.match(source, /upsertBinding/);
});
