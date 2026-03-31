import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("frontend bridge client exposes settings, status, and bindings methods", async () => {
  const source = await readFile(new URL("./client.ts", import.meta.url), "utf8");

  assert.match(source, /export type BridgeClient/);
  assert.match(source, /getSettings/);
  assert.match(source, /saveSettings/);
  assert.match(source, /getStatus/);
  assert.match(source, /listBindings/);
});

void test("desktop preload exposes a bridge API on nionDesktop", async () => {
  const source = await readFile(
    new URL("../../../../desktop/src/preload/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /bridge:/);
  assert.match(source, /getSettings/);
  assert.match(source, /saveSettings/);
  assert.match(source, /getStatus/);
  assert.match(source, /listBindings/);
});

void test("frontend bridge client memoizes the desktop bridge wrapper", async () => {
  const source = await readFile(new URL("./client.ts", import.meta.url), "utf8");

  assert.match(source, /let cachedBridgeClient: BridgeClient \| null \| undefined/);
  assert.match(source, /cachedDesktopBridge === bridge/);
  assert.match(source, /return cachedBridgeClient;/);
});
