import path from "node:path";

export type DesktopPlatform = "darwin" | "win32" | "linux";

export type DesktopRuntimeConfig = {
  resourcesPath: string;
  platform: DesktopPlatform;
  backendDir: string;
};

export function getDesktopRuntimeConfig(
  resourcesPath: string,
  platform: DesktopPlatform,
): DesktopRuntimeConfig {
  return {
    resourcesPath,
    platform,
    backendDir: path.join(resourcesPath, "backend", platform)
  };
}
