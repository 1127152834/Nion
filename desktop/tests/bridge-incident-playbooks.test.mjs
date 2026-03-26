import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;
const requireFn = nodeModule.createRequire(import.meta.url);

async function loadModuleFunctions(fileRelativePath, exportedNames) {
  const source = fs.readFileSync(new URL(fileRelativePath, import.meta.url), "utf8");
  let transformed = source;
  transformed = transformed.replace(/^import .*?;\n/gm, "");
  transformed = transformed.replace(/export function /g, "function ");
  transformed = stripTypeScriptTypes(transformed);
  return new Function(
    `${transformed}\nreturn { ${exportedNames.join(", ")} };`,
  )();
}

function baseContext() {
  return {
    status: {
      running: true,
      enabledPlatforms: ["telegram"],
      adapters: [
        {
          platform: "telegram",
          running: true,
          connectedAt: "2026-03-26T00:00:00.000Z",
          error: null,
        },
      ],
    },
    settings: { bridge_telegram_enabled: "true" },
    bindings: [
      {
        id: "binding-1",
        platform: "telegram",
        chatId: "chat-1",
        threadId: "thread-1",
        workingDirectory: "/tmp/project",
        active: true,
        createdAt: "2026-03-26T00:00:00.000Z",
        updatedAt: "2026-03-26T00:00:00.000Z",
      },
    ],
    weixinAccounts: [],
    observations: [],
  };
}

test("bridge playbook classifies bridge_manager_down deterministically", async () => {
  const { diagnoseBridgeIncident } = await loadModuleFunctions(
    "../src/main/bridge/incident-playbooks.ts",
    ["diagnoseBridgeIncident"],
  );
  const context = baseContext();
  context.status.running = false;
  context.status.adapters[0].running = false;

  const incident = diagnoseBridgeIncident(context, { source: "bridge_page" });

  assert.equal(incident.incidentType, "bridge_manager_down");
  assert.equal(incident.severity, "error");
  assert.ok(incident.summary);
  assert.ok(incident.userVisibleExplanation);
  assert.equal(incident.recommendedActions.length, 1);
});

test("bridge playbook classifies adapter_start_failure from recent observations", async () => {
  const { diagnoseBridgeIncident } = await loadModuleFunctions(
    "../src/main/bridge/incident-playbooks.ts",
    ["diagnoseBridgeIncident"],
  );
  const context = baseContext();
  context.observations = [
    {
      observationId: "obs-1",
      timestamp: "2026-03-26T00:00:00.000Z",
      observationType: "adapter_start_failed",
      level: "error",
      adapterPlatform: "telegram",
      bindingId: null,
      threadId: null,
      summary: "telegram adapter failed to start",
      details: { error: "bot token invalid" },
    },
  ];

  const incident = diagnoseBridgeIncident(context, {
    source: "bridge_page",
    adapterPlatform: "telegram",
  });

  assert.equal(incident.incidentType, "adapter_start_failure");
  assert.equal(incident.severity, "error");
  assert.ok(incident.evidence.primaryObservation);
  assert.equal(incident.recommendedActions[0].actionType, "probe_platform");
});

test("bridge playbook classifies adapter_runtime_failure from adapter status or runtime observation", async () => {
  const { diagnoseBridgeIncident } = await loadModuleFunctions(
    "../src/main/bridge/incident-playbooks.ts",
    ["diagnoseBridgeIncident"],
  );
  const context = baseContext();
  context.status.adapters[0].error = "gateway lost";

  const incident = diagnoseBridgeIncident(context, {
    source: "bridge_page",
    adapterPlatform: "telegram",
  });

  assert.equal(incident.incidentType, "adapter_runtime_failure");
  assert.equal(incident.severity, "error");
  assert.ok(incident.rootCauseHypothesis);
});

test("bridge playbook classifies bridge_delivery_failure from delivery observations", async () => {
  const { diagnoseBridgeIncident } = await loadModuleFunctions(
    "../src/main/bridge/incident-playbooks.ts",
    ["diagnoseBridgeIncident"],
  );
  const context = baseContext();
  context.observations = [
    {
      observationId: "obs-2",
      timestamp: "2026-03-26T00:00:00.000Z",
      observationType: "bridge_delivery_failed",
      level: "error",
      adapterPlatform: "telegram",
      bindingId: "binding-1",
      threadId: "thread-1",
      summary: "Bridge delivery failed for telegram",
      details: { error: "send failed" },
    },
  ];

  const incident = diagnoseBridgeIncident(context, {
    source: "bridge_page",
    adapterPlatform: "telegram",
    bindingId: "binding-1",
    threadId: "thread-1",
  });

  assert.equal(incident.incidentType, "bridge_delivery_failure");
  assert.equal(incident.severity, "error");
  assert.equal(incident.bindingId, "binding-1");
  assert.ok(incident.recommendedActions.length >= 1);
});
