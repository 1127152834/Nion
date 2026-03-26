import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as nodeModule from "node:module";

const { stripTypeScriptTypes } = nodeModule;

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

test("bridge incident controller persists and lists incidents through the incident store", async () => {
  const { createBridgeIncidentController } = await loadModuleFunctions(
    "../src/main/bridge/incident-playbooks.ts",
    ["createBridgeIncidentController"],
  );

  const recorded = [];
  const controller = createBridgeIncidentController({
    getStatus: () => ({
      running: false,
      enabledPlatforms: ["telegram"],
      adapters: [{ platform: "telegram", running: false, connectedAt: null, error: null }],
    }),
    loadSettings: () => ({ settings: { bridge_telegram_enabled: "true" } }),
    listBindings: () => [],
    listWeixinAccounts: () => [],
    listObservations: () => [],
    incidentStore: {
      recordIncident: (incident) => {
        const persisted = {
          incidentId: "inc-1",
          createdAt: "2026-03-26T00:00:00.000Z",
          updatedAt: "2026-03-26T00:00:00.000Z",
          ...incident,
        };
        recorded.push(persisted);
        return persisted;
      },
      listIncidents: () => recorded,
      getIncident: (incidentId) => recorded.find((item) => item.incidentId === incidentId) ?? null,
      dismissIncident: (incidentId) => {
        const existing = recorded.find((item) => item.incidentId === incidentId);
        if (!existing) {
          return null;
        }
        existing.status = "dismissed";
        existing.updatedAt = "2026-03-26T00:01:00.000Z";
        return existing;
      },
    },
  });

  const diagnosed = controller.diagnose({ source: "bridge_page" });
  assert.equal(diagnosed.incidentId, "inc-1");
  assert.equal(controller.listIncidents().length, 1);
  assert.equal(controller.getIncident("inc-1")?.incidentId, "inc-1");
  assert.equal(controller.dismissIncident("inc-1")?.status, "dismissed");
});

test("desktop main wires bridge incident IPC handlers", async () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /createBridgeIncidentController/);
  assert.match(source, /createBridgeIncidentsStore/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.listIncidents/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.getIncident/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.diagnose/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.dismissIncident/);
});
