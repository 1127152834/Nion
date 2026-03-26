import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import type { DesktopRuntimeInfo } from "../shared/ipc.js";
import type { DaemonCommand } from "./config.js";

export async function waitForDaemonHealthy(
  healthUrl: string,
  timeoutMs = 30_000,
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for daemon health at ${healthUrl}`);
}

async function fetchRuntimeInfo(baseUrl: string): Promise<DesktopRuntimeInfo> {
  const response = await fetch(`${baseUrl}/api/daemon/runtime-info`);
  if (!response.ok) {
    throw new Error(`Failed to load daemon runtime info (${response.status})`);
  }

  const payload = (await response.json()) as {
    allow_background_running?: boolean;
    base_url?: string;
    health_url?: string;
    mode?: string;
    working_directory?: string;
  };

  return {
    mode: payload.mode === "local-daemon" ? "local-daemon" : "local-daemon",
    baseUrl: payload.base_url ?? baseUrl,
    healthUrl: payload.health_url ?? `${baseUrl}/health`,
    workingDirectory: payload.working_directory ?? null,
    clientId: null,
    allowBackgroundRunning: Boolean(payload.allow_background_running),
  };
}

async function stopDaemon(baseUrl: string): Promise<void> {
  try {
    await fetch(`${baseUrl}/api/daemon/stop`, { method: "POST" });
  } catch {
    // best effort
  }
}

export function shouldReuseDaemon(
  command: DaemonCommand,
  runtimeInfo: DesktopRuntimeInfo,
): boolean {
  if (process.env.NION_DESKTOP_DEV_USE_BINARY === "1") {
    return true;
  }
  if (!runtimeInfo.workingDirectory) {
    return true;
  }
  return runtimeInfo.workingDirectory === command.cwd;
}

export async function ensureLocalDaemon(
  command: DaemonCommand,
): Promise<DesktopRuntimeInfo> {
  try {
    await waitForDaemonHealthy(command.urls.health, 1_000);
    const runtimeInfo = await fetchRuntimeInfo(command.urls.base);
    if (shouldReuseDaemon(command, runtimeInfo)) {
      return runtimeInfo;
    }
    await stopDaemon(command.urls.base);
  } catch {
    // fall through and spawn the expected daemon
  }

  const child = spawn(command.executable, command.args, {
    cwd: command.cwd,
    env: command.env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await waitForDaemonHealthy(command.urls.health);
  return await fetchRuntimeInfo(command.urls.base);
}
