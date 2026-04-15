import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge client exposes a first-class runtime overview contract", async () => {
  const source = await readFile(new URL("./client.ts", import.meta.url), "utf8");

  assert.match(source, /export type BridgeRuntimeInfo = \{/);
  assert.match(source, /running: boolean;/);
  assert.match(source, /autoStartEnabled: boolean;/);
  assert.match(source, /enabledPlatforms: string\[\];/);
  assert.match(source, /activeBindings: number;/);
  assert.match(source, /openIncidents: number;/);
  assert.match(source, /startedAt: string \| null;/);
  assert.match(source, /getRuntimeInfo\(\): Promise<BridgeRuntimeInfo>;/);
});

void test("desktop bridge wrapper forwards runtime overview calls", async () => {
  const source = await readFile(new URL("./client.ts", import.meta.url), "utf8");

  assert.match(source, /getRuntimeInfo: \(\) =>/);
  assert.match(
    source,
    /if \(!bridge\.getRuntimeInfo\) \{\s*return Promise\.reject\(/,
  );
  assert.match(source, /Bridge runtime info is unavailable/);
  assert.match(source, /return bridge\.getRuntimeInfo\(\);/);
});

void test("desktop preload exposes bridge runtime overview over the bridge IPC channel", async () => {
  const source = await readFile(
    new URL("../../../../desktop/src/preload/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /bridge:\s*\{/);
  assert.match(source, /getRuntimeInfo:\s*\(\)\s*=>/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.bridgeRuntimeInfo/);
});
