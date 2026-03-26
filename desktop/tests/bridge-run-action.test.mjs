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
  return new Function(`${transformed}\nreturn { ${exportedNames.join(", ")} };`)();
}

function incidentFixture(overrides = {}) {
  return {
    incidentId: "inc-1",
    createdAt: "2026-03-26T00:00:00.000Z",
    updatedAt: "2026-03-26T00:00:00.000Z",
    source: "bridge_page",
    incidentType: "bridge_manager_down",
    severity: "error",
    status: "open",
    adapterPlatform: "telegram",
    bindingId: null,
    threadId: null,
    summary: "Bridge manager is not running",
    userVisibleExplanation: "The bridge runtime is stopped.",
    rootCauseHypothesis: "No adapter is currently running.",
    confidence: 0.8,
    recommendedActions: [],
    executedActions: [],
    evidence: {},
    resolutionNote: null,
    ...overrides,
  };
}

test("bridge run-action executes an allowlisted action and persists executed_actions", async () => {
  const { createBridgeActionRunner } = await loadModuleFunctions(
    "../src/main/bridge/action-runner.ts",
    ["createBridgeActionRunner"],
  );

  const incident = incidentFixture({
    recommendedActions: [
      {
        actionId: "restart-bridge",
        actionType: "restart_bridge_runtime",
        label: "Restart bridge runtime",
        reason: "Restart the manager.",
        riskLevel: "low",
        requiresConfirmation: true,
        executableNow: true,
        scope: "global",
        platform: null,
        bindingId: null,
        ipcChannel: "bridge:run-action",
        ipcArgs: { action: "restart_bridge_runtime" },
        expectedOutcome: "Restart bridge runtime.",
      },
    ],
  });

  let restartCalls = 0;
  const runner = createBridgeActionRunner({
    incidentStore: {
      getIncident: () => incident,
      appendExecutedAction: (_incidentId, action) => ({
        ...incident,
        executedActions: [...incident.executedActions, action],
      }),
    },
    restartBridgeRuntime: async () => {
      restartCalls += 1;
    },
    probePlatform: async () => ({ ok: true, message: "ok" }),
    startWeixinLogin: async () => ({
      sessionId: "wx-1",
      qrcode: "qrcode",
      qrImage: "data:image/png;base64,abc",
      startedAt: 0,
      refreshCount: 0,
      status: "waiting",
    }),
  });

  const result = await runner.runAction({ incidentId: "inc-1", actionId: "restart-bridge" });

  assert.equal(restartCalls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.status, "completed");
  assert.equal(result.incident?.executedActions.length, 1);
});

test("bridge run-action rejects unsupported actions outside the allowlist", async () => {
  const { createBridgeActionRunner } = await loadModuleFunctions(
    "../src/main/bridge/action-runner.ts",
    ["createBridgeActionRunner"],
  );

  const incident = incidentFixture({
    recommendedActions: [
      {
        actionId: "review-bindings",
        actionType: "review_bindings",
        label: "Review bridge bindings",
        reason: "Inspect bindings.",
        riskLevel: "low",
        requiresConfirmation: true,
        executableNow: true,
        scope: "binding",
        platform: null,
        bindingId: "binding-1",
        ipcChannel: "bridge:run-action",
        ipcArgs: { action: "review_bindings" },
        expectedOutcome: "Inspect bindings.",
      },
    ],
  });

  const runner = createBridgeActionRunner({
    incidentStore: {
      getIncident: () => incident,
      appendExecutedAction: () => {
        throw new Error("should not persist rejected action");
      },
    },
    restartBridgeRuntime: async () => {},
    probePlatform: async () => ({ ok: true, message: "ok" }),
    startWeixinLogin: async () => ({
      sessionId: "wx-1",
      qrcode: "qrcode",
      qrImage: "data:image/png;base64,abc",
      startedAt: 0,
      refreshCount: 0,
      status: "waiting",
    }),
  });

  const result = await runner.runAction({ incidentId: "inc-1", actionId: "review-bindings" });

  assert.equal(result.ok, false);
  assert.equal(result.status, "rejected");
});

test("bridge run-action requires a matching recommended action on the incident", async () => {
  const { createBridgeActionRunner } = await loadModuleFunctions(
    "../src/main/bridge/action-runner.ts",
    ["createBridgeActionRunner"],
  );

  const runner = createBridgeActionRunner({
    incidentStore: {
      getIncident: () => incidentFixture({ recommendedActions: [] }),
      appendExecutedAction: () => {
        throw new Error("should not persist missing action");
      },
    },
    restartBridgeRuntime: async () => {},
    probePlatform: async () => ({ ok: true, message: "ok" }),
    startWeixinLogin: async () => ({
      sessionId: "wx-1",
      qrcode: "qrcode",
      qrImage: "data:image/png;base64,abc",
      startedAt: 0,
      refreshCount: 0,
      status: "waiting",
    }),
  });

  const result = await runner.runAction({ incidentId: "inc-1", actionId: "missing" });

  assert.equal(result.ok, false);
  assert.equal(result.status, "rejected");
});

test("desktop main wires bridge run-action IPC handler", async () => {
  const source = fs.readFileSync(new URL("../src/main/index.ts", import.meta.url), "utf8");

  assert.match(source, /createBridgeActionRunner/);
  assert.match(source, /DESKTOP_BRIDGE_IPC_CHANNELS\.runAction/);
});
