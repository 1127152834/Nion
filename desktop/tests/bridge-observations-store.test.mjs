import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;
const requireFn = nodeModule.createRequire(import.meta.url);

async function loadModuleFunctions(fileRelativePath, exportedNames) {
  const source = fs.readFileSync(new URL(fileRelativePath, import.meta.url), "utf8");
  let transformed = source;
  transformed = transformed.replace(/^import .*?;\n/gm, "");
  for (const name of exportedNames) {
    transformed = transformed.replace(new RegExp(`export function ${name}`, "g"), `function ${name}`);
    transformed = transformed.replace(new RegExp(`export type ${name}`, "g"), `type ${name}`);
  }
  transformed = stripTypeScriptTypes(transformed);
  return new Function(
    "require",
    "fs",
    "path",
    "randomUUID",
    `${transformed}\nreturn { ${exportedNames.join(", ")} };`,
  )(
    requireFn,
    fs,
    path,
    requireFn("node:crypto").randomUUID,
  );
}

test("bridge observations store appends and lists observations", async () => {
  const { createBridgeObservationsStore } = await loadModuleFunctions(
    "../src/main/bridge/observations-store.ts",
    ["createBridgeObservationsStore"],
  );

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nion-bridge-observations-"));
  const store = createBridgeObservationsStore(path.join(tempDir, "observations.json"));

  store.appendObservation({
    observationType: "bridge_manager_started",
    level: "info",
    adapterPlatform: null,
    bindingId: null,
    threadId: null,
    summary: "Bridge manager started",
    details: { enabledPlatforms: ["feishu"] },
  });
  store.appendObservation({
    observationType: "adapter_start_failed",
    level: "error",
    adapterPlatform: "telegram",
    bindingId: null,
    threadId: null,
    summary: "Telegram adapter failed to start",
    details: { reason: "bot token missing" },
  });

  const all = store.listObservations();
  const adapterErrors = store.listObservations({
    observationType: "adapter_start_failed",
    adapterPlatform: "telegram",
  });

  assert.equal(all.length, 2);
  assert.equal(all[0].summary, "Telegram adapter failed to start");
  assert.equal(adapterErrors.length, 1);
  assert.equal(adapterErrors[0].adapterPlatform, "telegram");
});

test("bridge observations store keeps only the newest bounded observations", async () => {
  const { createBridgeObservationsStore } = await loadModuleFunctions(
    "../src/main/bridge/observations-store.ts",
    ["createBridgeObservationsStore"],
  );

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nion-bridge-observations-"));
  const store = createBridgeObservationsStore(path.join(tempDir, "observations.json"), { maxItems: 2 });

  store.appendObservation({
    observationType: "bridge_manager_started",
    level: "info",
    adapterPlatform: null,
    bindingId: null,
    threadId: null,
    summary: "one",
    details: {},
  });
  store.appendObservation({
    observationType: "bridge_manager_started",
    level: "info",
    adapterPlatform: null,
    bindingId: null,
    threadId: null,
    summary: "two",
    details: {},
  });
  store.appendObservation({
    observationType: "bridge_manager_started",
    level: "info",
    adapterPlatform: null,
    bindingId: null,
    threadId: null,
    summary: "three",
    details: {},
  });

  const observations = store.listObservations();
  assert.equal(observations.length, 2);
  assert.equal(observations[0].summary, "three");
  assert.equal(observations[1].summary, "two");
});
