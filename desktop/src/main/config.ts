import path from "node:path";

export type SupportedDesktopPlatform = "darwin" | "win32" | "linux";

export type BuildDaemonCommandOptions = {
  appRoot: string;
  resourcesPath: string;
  userDataPath: string;
  platform: NodeJS.Platform | SupportedDesktopPlatform;
  packaged?: boolean;
  helperPort?: number;
};

export type DaemonCommand = {
  executable: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  urls: {
    base: string;
    health: string;
  };
};

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
    healthUrl: `${backendUrl}/health`,
  };
}

export function buildDaemonCommand(options: BuildDaemonCommandOptions): DaemonCommand {
  const environment = resolveDesktopEnvironment({
    appRoot: options.appRoot,
    resourcesPath: options.resourcesPath,
    userDataPath: options.userDataPath,
    platform: options.platform,
    packaged: options.packaged,
    helperPort: options.helperPort,
  });

  if (!options.packaged && process.env.NION_DESKTOP_DEV_USE_BINARY !== "1") {
    return {
      executable: process.env.NION_DESKTOP_DEV_HELPER_EXECUTABLE ?? "uv",
      args: ["run", "python", "-m", "app.daemon.main"],
      cwd: path.join(options.appRoot, "backend"),
      env: {
        ...process.env,
        NION_DAEMON_ALLOW_BACKGROUND_RUNNING:
          process.env.NION_DAEMON_ALLOW_BACKGROUND_RUNNING ?? "1",
      },
      urls: {
        base: environment.backendUrl,
        health: environment.healthUrl,
      },
    };
  }

  return {
    executable: environment.backendExecutable,
    args: [],
    cwd: environment.backendDir,
    env: {
      ...process.env,
    },
    urls: {
      base: environment.backendUrl,
      health: environment.healthUrl,
    },
  };
}
