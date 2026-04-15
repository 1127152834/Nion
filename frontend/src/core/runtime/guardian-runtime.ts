"use client";

import type { BridgeRuntimeInfo } from "../bridge/client.ts";
import type {
  DesktopGuardianModeStatus,
  DesktopRuntimeInfo,
} from "../api/desktop-client.ts";

export type GuardianRuntimeLoadState = "loading" | "ready" | "unavailable" | "error";

export type GuardianRuntimeSnapshot = {
  loadState: GuardianRuntimeLoadState;
  guardianStatus: DesktopGuardianModeStatus;
  bridgeRunning: boolean | null;
  bridgeAutoStartEnabled: boolean | null;
  enabledPlatforms: number | null;
  activeBindings: number | null;
  openIncidents: number | null;
  startedAt: string | null;
};

type GuardianRuntimeErrorState = "unavailable" | "error" | null | undefined;

function createGuardianRuntimeSnapshot(
  loadState: GuardianRuntimeLoadState,
): GuardianRuntimeSnapshot {
  return {
    loadState,
    guardianStatus: "offline",
    bridgeRunning: null,
    bridgeAutoStartEnabled: null,
    enabledPlatforms: null,
    activeBindings: null,
    openIncidents: null,
    startedAt: null,
  };
}

export function mergeGuardianRuntime(input: {
  desktopRuntime: DesktopRuntimeInfo | null;
  bridgeRuntime: BridgeRuntimeInfo | null;
  error?: GuardianRuntimeErrorState;
}): GuardianRuntimeSnapshot {
  if (input.error === "error") {
    return createGuardianRuntimeSnapshot("error");
  }

  if (input.error === "unavailable" || (!input.desktopRuntime && !input.bridgeRuntime)) {
    return createGuardianRuntimeSnapshot("unavailable");
  }

  return {
    loadState: "ready",
    guardianStatus: input.desktopRuntime?.guardianMode.status ?? "offline",
    bridgeRunning:
      input.bridgeRuntime?.running ?? input.desktopRuntime?.bridgeRuntime.running ?? null,
    bridgeAutoStartEnabled: input.bridgeRuntime?.autoStartEnabled ?? null,
    enabledPlatforms: input.bridgeRuntime?.enabledPlatforms.length ?? null,
    activeBindings: input.bridgeRuntime?.activeBindings ?? null,
    openIncidents: input.bridgeRuntime?.openIncidents ?? null,
    startedAt: input.bridgeRuntime?.startedAt ?? null,
  };
}
