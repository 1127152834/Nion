import path from "node:path";

export type SupportedDesktopPlatform = "darwin" | "win32" | "linux";

export type DesktopEnvironment = {
  appRoot: string;
  resourcesPath: string;
  userDataPath: string;
  platform: SupportedDesktopPlatform;
  backendDir: string;
  backendExecutable: string;
  backendUrl: string;
  healthUrl: string;
};

const DEFAULT_HELPER_PORT = 43115;

function getBackendBinaryName(platform: SupportedDesktopPlatform): string {
  return platform === "win32" ? "nion-backend.exe" : "nion-backend";
}

function normalizePlatform(platform: NodeJS.Platform | SupportedDesktopPlatform): SupportedDesktopPlatform {
  if (platform === "darwin" || platform === "win32" || platform === "linux") {
    return platform;
  }
  return "linux";
}

export function resolveDesktopEnvironment(options: {
  appRoot: string;
  resourcesPath: string;
  userDataPath: string;
  platform: NodeJS.Platform | SupportedDesktopPlatform;
  packaged?: boolean;
  helperPort?: number;
}): DesktopEnvironment {
  const platform = normalizePlatform(options.platform);
  const helperPort = options.helperPort ?? DEFAULT_HELPER_PORT;
  const backendDir = options.packaged
    ? path.join(options.resourcesPath, "backend", platform, "nion-backend")
    : path.join(options.appRoot, "backend", "dist", "nion-backend", platform, "nion-backend");
  const backendExecutable = path.join(backendDir, getBackendBinaryName(platform));
  const backendUrl = `http://127.0.0.1:${helperPort}`;

  return {
    appRoot: options.appRoot,
    resourcesPath: options.resourcesPath,
    userDataPath: options.userDataPath,
    platform,
    backendDir,
    backendExecutable,
    backendUrl,
    healthUrl: `${backendUrl}/api/desktop/health`,
  };
}
