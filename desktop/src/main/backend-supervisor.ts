import path from "node:path";

import {
  getDesktopRuntimeConfig,
  type DesktopPlatform
} from "./config.js";

export type BackendCommand = {
  executable: string;
  args: string[];
  env: Record<string, string>;
};

export type BackendCommandOptions = {
  resourcesPath: string;
  platform: DesktopPlatform;
};

export type BackendSupervisor = {
  command: BackendCommand;
  healthCheckUrl: string;
  restartPolicy: "on-failure";
};

function getExecutableName(platform: DesktopPlatform): string {
  return platform === "win32" ? "nion-backend.exe" : "nion-backend";
}

export function buildBackendCommand(
  options: BackendCommandOptions,
): BackendCommand {
  const runtime = getDesktopRuntimeConfig(options.resourcesPath, options.platform);
  const executable = path.join(runtime.backendDir, getExecutableName(options.platform));

  return {
    executable,
    args: ["--mode", "desktop"],
    env: {
      NION_DESKTOP_HELPER_MODE: "1",
      NION_DESKTOP_BACKEND_DIR: runtime.backendDir
    }
  };
}

export function createBackendSupervisor(
  options: BackendCommandOptions,
): BackendSupervisor {
  return {
    command: buildBackendCommand(options),
    healthCheckUrl: "http://127.0.0.1:43115/api/desktop/health",
    restartPolicy: "on-failure"
  };
}
