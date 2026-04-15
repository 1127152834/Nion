"use client";

import type { BridgeRuntimeInfo } from "../bridge/client.ts";
import type { DesktopGuardianModeStatus } from "../api/desktop-client.ts";

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

export type GuardianRuntimeDesktopInput = {
  mode?: string | null;
  baseUrl?: string | null;
  healthUrl?: string | null;
  workingDirectory?: string | null;
  clientId?: string | null;
  allowBackgroundRunning?: boolean | null;
};

export type GuardianRuntimeDaemonInput = {
  mode?: string | null;
  base_url?: string | null;
  health_url?: string | null;
  working_directory?: string | null;
  allow_background_running?: boolean | null;
  guardian_mode?: {
    enabled?: boolean | null;
    window_required?: boolean | null;
    status?: string | null;
  };
  bridge_runtime?: {
    available?: boolean | null;
    running?: boolean | null;
  };
};

export type NormalizedGuardianDesktopRuntime = {
  mode: string;
  baseUrl: string;
  healthUrl: string;
  workingDirectory: string | null;
  clientId: string | null;
  allowBackgroundRunning: boolean;
  guardianMode: {
    enabled: boolean;
    windowRequired: boolean;
    status: DesktopGuardianModeStatus;
  };
  bridgeRuntime: {
    available: boolean;
    running: boolean | null;
  };
};

type GuardianRuntimeErrorState = "unavailable" | "error" | null | undefined;

export function createGuardianRuntimeSnapshot(
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

function normalizeText(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeGuardianStatus(value: string | null | undefined): DesktopGuardianModeStatus {
  return value === "standing_by" || value === "busy" || value === "offline"
    ? value
    : "offline";
}

function isNormalizedGuardianDesktopRuntime(
  input: GuardianRuntimeDesktopInput | NormalizedGuardianDesktopRuntime,
): input is NormalizedGuardianDesktopRuntime {
  return "guardianMode" in input && "bridgeRuntime" in input;
}

export function normalizeGuardianDesktopRuntime(input: {
  desktopRuntime: GuardianRuntimeDesktopInput;
  daemonRuntime?: GuardianRuntimeDaemonInput | null;
}): NormalizedGuardianDesktopRuntime {
  const baseDesktopBaseUrl = normalizeText(input.desktopRuntime.baseUrl);
  const daemonBaseUrl = normalizeText(input.daemonRuntime?.base_url);
  const baseUrl = daemonBaseUrl || baseDesktopBaseUrl;
  const desktopHealthUrl = normalizeText(input.desktopRuntime.healthUrl);
  const daemonHealthUrl = normalizeText(input.daemonRuntime?.health_url);
  const allowBackgroundRunning =
    input.daemonRuntime?.allow_background_running === true ||
    (input.daemonRuntime?.allow_background_running == null &&
      input.desktopRuntime.allowBackgroundRunning === true);

  return {
    mode: normalizeText(input.daemonRuntime?.mode) || normalizeText(input.desktopRuntime.mode) || "local-daemon",
    baseUrl,
    healthUrl: daemonHealthUrl || desktopHealthUrl || (baseUrl ? `${baseUrl}/health` : ""),
    workingDirectory:
      normalizeNullableText(input.daemonRuntime?.working_directory) ??
      normalizeNullableText(input.desktopRuntime.workingDirectory),
    clientId: normalizeNullableText(input.desktopRuntime.clientId),
    allowBackgroundRunning,
    guardianMode: {
      enabled:
        input.daemonRuntime?.guardian_mode?.enabled === true ||
        (input.daemonRuntime?.guardian_mode?.enabled == null && allowBackgroundRunning),
      windowRequired: input.daemonRuntime?.guardian_mode?.window_required === true,
      status: normalizeGuardianStatus(input.daemonRuntime?.guardian_mode?.status),
    },
    bridgeRuntime: {
      available:
        input.daemonRuntime?.bridge_runtime?.available === true ||
        (input.daemonRuntime?.bridge_runtime?.available == null && Boolean(baseUrl)),
      running:
        input.daemonRuntime?.bridge_runtime?.running === undefined
          ? null
          : input.daemonRuntime.bridge_runtime.running,
    },
  };
}

export function resolveGuardianDesktopRuntime(input: {
  desktopRuntime: GuardianRuntimeDesktopInput;
  daemonRuntime?: GuardianRuntimeDaemonInput | null;
  bridgeRuntime?: BridgeRuntimeInfo | null;
  error?: GuardianRuntimeErrorState;
}): NormalizedGuardianDesktopRuntime {
  const normalizedDesktopRuntime = normalizeGuardianDesktopRuntime({
    desktopRuntime: input.desktopRuntime,
    daemonRuntime: input.daemonRuntime ?? null,
  });
  const snapshot = mergeGuardianRuntime({
    desktopRuntime: normalizedDesktopRuntime,
    daemonRuntime: input.daemonRuntime ?? null,
    bridgeRuntime: input.bridgeRuntime ?? null,
    error: input.error,
  });

  return {
    ...normalizedDesktopRuntime,
    guardianMode: {
      ...normalizedDesktopRuntime.guardianMode,
      status: snapshot.guardianStatus,
    },
    bridgeRuntime: {
      ...normalizedDesktopRuntime.bridgeRuntime,
      running: snapshot.bridgeRunning,
    },
  };
}

export function mergeGuardianRuntime(input: {
  desktopRuntime: GuardianRuntimeDesktopInput | NormalizedGuardianDesktopRuntime | null;
  daemonRuntime?: GuardianRuntimeDaemonInput | null;
  bridgeRuntime: BridgeRuntimeInfo | null;
  error?: GuardianRuntimeErrorState;
}): GuardianRuntimeSnapshot {
  if (input.error === "error") {
    return createGuardianRuntimeSnapshot("error");
  }

  if (input.error === "unavailable" || (!input.desktopRuntime && !input.bridgeRuntime)) {
    return createGuardianRuntimeSnapshot("unavailable");
  }

  const normalizedDesktopRuntime = input.desktopRuntime
    ? isNormalizedGuardianDesktopRuntime(input.desktopRuntime)
      ? input.desktopRuntime
      : normalizeGuardianDesktopRuntime({
          desktopRuntime: input.desktopRuntime,
          daemonRuntime: input.daemonRuntime ?? null,
        })
    : null;

  return {
    loadState: "ready",
    guardianStatus: normalizedDesktopRuntime?.guardianMode.status ?? "offline",
    bridgeRunning:
      input.bridgeRuntime?.running ?? normalizedDesktopRuntime?.bridgeRuntime.running ?? null,
    bridgeAutoStartEnabled: input.bridgeRuntime?.autoStartEnabled ?? null,
    enabledPlatforms: input.bridgeRuntime?.enabledPlatforms.length ?? null,
    activeBindings: input.bridgeRuntime?.activeBindings ?? null,
    openIncidents: input.bridgeRuntime?.openIncidents ?? null,
    startedAt: input.bridgeRuntime?.startedAt ?? null,
  };
}

export function resolveGuardianRuntimeSnapshot(input: {
  desktopRuntime: GuardianRuntimeDesktopInput | NormalizedGuardianDesktopRuntime | null;
  daemonRuntime?: GuardianRuntimeDaemonInput | null;
  bridgeRuntime: BridgeRuntimeInfo | null;
  bridgeRuntimeError?: boolean;
  error?: GuardianRuntimeErrorState;
}): GuardianRuntimeSnapshot {
  if (input.bridgeRuntimeError === true && !input.desktopRuntime) {
    return mergeGuardianRuntime({
      desktopRuntime: null,
      daemonRuntime: input.daemonRuntime ?? null,
      bridgeRuntime: null,
      error: input.error ?? "unavailable",
    });
  }

  return mergeGuardianRuntime({
    desktopRuntime: input.desktopRuntime,
    daemonRuntime: input.daemonRuntime ?? null,
    bridgeRuntime: input.bridgeRuntime,
    error: input.error,
  });
}
