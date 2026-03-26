import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge client exposes start and stop controls", async () => {
  const source = await readFile(
    new URL("../../../core/bridge/client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /start\(\): Promise<void>/);
  assert.match(source, /stop\(\): Promise<void>/);
});

void test("desktop preload exposes bridge start and stop methods", async () => {
  const source = await readFile(
    new URL("../../../../../desktop/src/preload/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /start: \(\) => ipcRenderer\.invoke\(DESKTOP_BRIDGE_IPC_CHANNELS\.start\)/);
  assert.match(source, /stop: \(\) => ipcRenderer\.invoke\(DESKTOP_BRIDGE_IPC_CHANNELS\.stop\)/);
});

void test("bridge section renders runtime control buttons", async () => {
  const source = await readFile(
    new URL("./BridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /t\.bridge\.overview\.startAction/);
  assert.match(source, /t\.bridge\.overview\.stopAction/);
});
