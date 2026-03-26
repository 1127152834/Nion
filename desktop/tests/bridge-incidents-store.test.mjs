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

test("bridge incidents store persists and filters incidents", async () => {
  const { createBridgeIncidentsStore } = await loadModuleFunctions(
    "../src/main/bridge/incidents-store.ts",
    ["createBridgeIncidentsStore"],
  );

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nion-bridge-incidents-"));
  const store = createBridgeIncidentsStore(path.join(tempDir, "incidents.json"));

  store.recordIncident({
    incidentType: "adapter_start_failure",
    source: "bridge_page",
    severity: "error",
    status: "open",
    adapterPlatform: "feishu",
    bindingId: null,
    threadId: null,
    summary: "Feishu adapter failed to start",
    userVisibleExplanation: "The Feishu bridge could not start.",
    rootCauseHypothesis: "App credentials are invalid.",
    confidence: 0.9,
    recommendedActions: [],
    executedActions: [],
    evidence: { stage: "start" },
    resolutionNote: null,
  });
  store.recordIncident({
    incidentType: "bridge_manager_down",
    source: "bridge_page",
    severity: "warning",
    status: "dismissed",
    adapterPlatform: null,
    bindingId: null,
    threadId: null,
    summary: "Bridge manager is not running",
    userVisibleExplanation: "The bridge runtime is stopped.",
    rootCauseHypothesis: "No adapters are enabled.",
    confidence: 0.7,
    recommendedActions: [],
    executedActions: [],
    evidence: { stage: "manager" },
    resolutionNote: null,
  });

  const openIncidents = store.listIncidents({ status: "open" });
  const feishuIncidents = store.listIncidents({ adapterPlatform: "feishu" });

  assert.equal(openIncidents.length, 1);
  assert.equal(openIncidents[0].incidentType, "adapter_start_failure");
  assert.equal(feishuIncidents.length, 1);
  assert.equal(feishuIncidents[0].adapterPlatform, "feishu");
  assert.equal(store.listIncidents().length, 2);
});

test("bridge incidents store gets and dismisses incidents", async () => {
  const { createBridgeIncidentsStore } = await loadModuleFunctions(
    "../src/main/bridge/incidents-store.ts",
    ["createBridgeIncidentsStore"],
  );

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nion-bridge-incidents-"));
  const store = createBridgeIncidentsStore(path.join(tempDir, "incidents.json"));

  const created = store.recordIncident({
    incidentType: "bridge_delivery_failure",
    source: "bridge_page",
    severity: "error",
    status: "open",
    adapterPlatform: "telegram",
    bindingId: "binding-1",
    threadId: "thread-1",
    summary: "Bridge delivery failed",
    userVisibleExplanation: "The outbound message could not be delivered.",
    rootCauseHypothesis: "The adapter send call returned an error.",
    confidence: 0.85,
    recommendedActions: [{ actionId: "probe", label: "Probe adapter" }],
    executedActions: [],
    evidence: { stage: "delivery" },
    resolutionNote: null,
  });

  const fetched = store.getIncident(created.incidentId);
  assert.equal(fetched?.incidentId, created.incidentId);
  assert.equal(fetched?.status, "open");

  const dismissed = store.dismissIncident(created.incidentId);
  assert.equal(dismissed?.status, "dismissed");
  assert.ok(dismissed?.updatedAt);
});
