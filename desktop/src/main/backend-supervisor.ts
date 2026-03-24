import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import { resolveDesktopEnvironment, type SupportedDesktopPlatform } from "./config.js";

export type BuildBackendCommandOptions = {
  resourcesPath: string;
  userDataPath?: string;
  platform: NodeJS.Platform | SupportedDesktopPlatform;
  helperPort?: number;
};

export type BackendCommand = {
  executable: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  urls: {
    base: string;
    health: string;
  };
};

export type BackendRuntimeInfo = {
  running: boolean;
  pid: number | null;
  baseUrl: string;
  healthUrl: string;
};

export function buildBackendCommand(options: BuildBackendCommandOptions): BackendCommand {
  const environment = resolveDesktopEnvironment({
    resourcesPath: options.resourcesPath,
    userDataPath: options.userDataPath ?? process.cwd(),
    platform: options.platform,
    helperPort: options.helperPort,
  });

  return {
    executable: environment.backendExecutable,
    args: [],
    cwd: environment.backendDir,
    env: {
      ...process.env,
      NION_DESKTOP_HELPER_MODE: "1",
      NION_DESKTOP_HELPER_URL: environment.backendUrl,
      NION_DESKTOP_HELPER_USER_DATA: environment.userDataPath,
    },
    urls: {
      base: environment.backendUrl,
      health: environment.healthUrl,
    },
  };
}

export async function waitForBackendHealthy(
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
      // Retry until timeout.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for backend health at ${healthUrl}`);
}

export class BackendSupervisor {
  private readonly command: BackendCommand;
  private child: ChildProcess | null = null;

  constructor(command: BackendCommand) {
    this.command = command;
  }

  async start(): Promise<BackendRuntimeInfo> {
    if (this.child && this.child.exitCode === null) {
      return this.getRuntimeInfo();
    }

    this.child = spawn(this.command.executable, this.command.args, {
      cwd: this.command.cwd,
      env: this.command.env,
      stdio: "ignore",
    });

    const child = this.child;
    const startupFailure = new Promise<never>((_, reject) => {
      child.once("error", (error) => {
        reject(error);
      });
      child.once("exit", (code, signal) => {
        reject(
          new Error(
            `Backend helper exited before becoming healthy (code=${code ?? "null"}, signal=${signal ?? "null"})`,
          ),
        );
      });
    });

    await Promise.race([
      waitForBackendHealthy(this.command.urls.health),
      startupFailure,
    ]);
    return this.getRuntimeInfo();
  }

  async stop(): Promise<void> {
    if (!this.child) {
      return;
    }

    this.child.kill("SIGTERM");
    this.child = null;
  }

  getRuntimeInfo(): BackendRuntimeInfo {
    return {
      running: this.child?.exitCode === null,
      pid: this.child?.pid ?? null,
      baseUrl: this.command.urls.base,
      healthUrl: this.command.urls.health,
    };
  }
}

export function createBackendSupervisor(options: BuildBackendCommandOptions): BackendSupervisor {
  return new BackendSupervisor(buildBackendCommand(options));
}
