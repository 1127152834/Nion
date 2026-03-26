import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop bridge IPC contract is defined", () => {
  const source = fs.readFileSync(
    new URL("../src/shared/bridge-ipc.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS/);
  assert.match(source, /getSettings/);
  assert.match(source, /saveSettings/);
  assert.match(source, /getStatus/);
  assert.match(source, /listBindings/);
});

test("desktop bridge settings store contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/settings-store.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export type BridgeSettingsDocument/);
  assert.match(source, /export function createBridgeSettingsStore/);
  assert.match(source, /loadSettings/);
  assert.match(source, /saveSettings/);
});

test("desktop bridge bindings store contract exists", () => {
  const source = fs.readFileSync(
    new URL("../src/main/bridge/bindings-store.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /export type BridgeBinding/);
  assert.match(source, /export function createBridgeBindingsStore/);
  assert.match(source, /upsertBinding/);
  assert.match(source, /listBindings/);
});
