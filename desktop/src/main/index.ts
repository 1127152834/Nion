import { createBackendSupervisor } from "./backend-supervisor.js";
import { getMainWindowOptions } from "./window.js";
import { bootstrapDesktopProtocol } from "./protocol.js";
import { initializeUpdater } from "./updater.js";

export function startDesktopMain(resourcesPath = process.cwd()): void {
  const protocol = bootstrapDesktopProtocol();
  const supervisor = createBackendSupervisor({
    resourcesPath,
    platform: process.platform as "darwin" | "win32" | "linux"
  });
  const windowOptions = getMainWindowOptions("desktop-preload");
  const updater = initializeUpdater();

  console.log(
    JSON.stringify({
      protocol,
      supervisor,
      windowOptions,
      updater
    }),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startDesktopMain();
}
