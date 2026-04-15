import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("guardian runtime module defines one shared visibility model and merge rules", async () => {
  const source = await readFile(new URL("./guardian-runtime.ts", import.meta.url), "utf8");

  assert.match(source, /export type GuardianRuntimeSnapshot =/);
  assert.match(source, /export type GuardianRuntimeLoadState =/);
  assert.match(source, /export function mergeGuardianRuntime/);
});

void test("guardian runtime merge returns unavailable when no runtime is reachable", async () => {
  const { mergeGuardianRuntime } = await import("./guardian-runtime.ts");

  assert.deepEqual(
    mergeGuardianRuntime({
      desktopRuntime: null,
      bridgeRuntime: null,
    }),
    {
      loadState: "unavailable",
      guardianStatus: "offline",
      bridgeRunning: null,
      bridgeAutoStartEnabled: null,
      enabledPlatforms: null,
      activeBindings: null,
      openIncidents: null,
      startedAt: null,
    },
  );
});

void test("guardian runtime merge returns error snapshot when refresh fails", async () => {
  const { mergeGuardianRuntime } = await import("./guardian-runtime.ts");

  assert.deepEqual(
    mergeGuardianRuntime({
      desktopRuntime: null,
      bridgeRuntime: null,
      error: "error",
    }),
    {
      loadState: "error",
      guardianStatus: "offline",
      bridgeRunning: null,
      bridgeAutoStartEnabled: null,
      enabledPlatforms: null,
      activeBindings: null,
      openIncidents: null,
      startedAt: null,
    },
  );
});

void test("guardian runtime merge prefers bridge overview and desktop guardian status when both exist", async () => {
  const { mergeGuardianRuntime } = await import("./guardian-runtime.ts");

  assert.deepEqual(
    mergeGuardianRuntime({
      desktopRuntime: {
        mode: "local-daemon",
        baseUrl: "http://127.0.0.1:43115",
        healthUrl: "http://127.0.0.1:43115/health",
        workingDirectory: "/desktop",
        clientId: "desktop-client-merge",
        allowBackgroundRunning: true,
        guardianMode: {
          enabled: true,
          windowRequired: false,
          status: "busy",
        },
        bridgeRuntime: {
          available: true,
          running: false,
        },
      },
      bridgeRuntime: {
        running: true,
        autoStartEnabled: true,
        enabledPlatforms: ["telegram", "discord"],
        activeBindings: 3,
        openIncidents: 1,
        startedAt: "2026-04-15T08:00:00.000Z",
      },
    }),
    {
      loadState: "ready",
      guardianStatus: "busy",
      bridgeRunning: true,
      bridgeAutoStartEnabled: true,
      enabledPlatforms: 2,
      activeBindings: 3,
      openIncidents: 1,
      startedAt: "2026-04-15T08:00:00.000Z",
    },
  );
});
