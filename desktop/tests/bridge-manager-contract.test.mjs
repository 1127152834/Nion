import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop bridge base adapter contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/base-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export abstract class BaseBridgeAdapter/);
  assert.match(source, /abstract readonly platform:/);
  assert.match(source, /abstract start\(\): Promise<void>/);
  assert.match(source, /abstract stop\(\): Promise<void>/);
  assert.match(source, /abstract getStatus\(\)/);
});

test("desktop bridge manager exposes start stop and getStatus", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export function createBridgeManager/);
  assert.match(source, /start: async \(\)/);
  assert.match(source, /stop: async \(\)/);
  assert.match(source, /getStatus: \(\)/);
});

test("desktop bridge manager caches adapter instances for stable lifecycle state", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bridge-manager.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /let resolvedAdapters:/);
  assert.match(source, /resolvedAdapters \?\?=/);
});
