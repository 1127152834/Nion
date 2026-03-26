import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("bridge client exposes incident workflow methods", async () => {
  const source = await readFile(
    new URL("../../../core/bridge/client.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /listIncidents\(/);
  assert.match(source, /getIncident\(/);
  assert.match(source, /diagnose\(/);
  assert.match(source, /dismissIncident\(/);
  assert.match(source, /runAction\(/);
});

void test("desktop preload exposes bridge incident workflow methods", async () => {
  const source = await readFile(
    new URL("../../../../../desktop/src/preload/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /listIncidents:/);
  assert.match(source, /getIncident:/);
  assert.match(source, /diagnose:/);
  assert.match(source, /dismissIncident:/);
  assert.match(source, /runAction:/);
});

void test("bridge section renders the self-heal panel", async () => {
  const source = await readFile(
    new URL("./BridgeSection.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /BridgeIncidentsPanel/);
});

void test("bridge incidents panel exposes diagnose and confirm-run flow", async () => {
  const source = await readFile(
    new URL("./BridgeIncidentsPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /Diagnose Bridge/);
  assert.match(source, /Confirm and Run/);
  assert.match(source, /Dismiss Incident/);
  assert.match(source, /window\.confirm/);
});
