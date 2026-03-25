import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, ipcMain } from "electron";

import { createBackendSupervisor } from "./backend-supervisor.js";
import { resolveDesktopEnvironment } from "./config.js";
import { registerDesktopProtocol } from "./protocol.js";
import { createDesktopUpdater, registerUpdaterHandlers } from "./updater.js";
import { createMainWindow } from "./window.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startDesktopMain(): Promise<void> {
  await app.whenReady();

  const appRoot = app.isPackaged
    ? process.resourcesPath
    : path.resolve(__dirname, "..", "..", "..");

  const environment = resolveDesktopEnvironment({
    appRoot,
    resourcesPath: process.resourcesPath,
    userDataPath: app.getPath("userData"),
    platform: process.platform,
    packaged: app.isPackaged,
  });

  await registerDesktopProtocol();

  const supervisor = createBackendSupervisor({
    appRoot: environment.appRoot,
    resourcesPath: environment.resourcesPath,
    userDataPath: environment.userDataPath,
    platform: environment.platform,
    packaged: app.isPackaged,
  });

  await supervisor.start();

  const updater = createDesktopUpdater();
  registerUpdaterHandlers(ipcMain, updater, () => supervisor.getRuntimeInfo());

  const preloadPath = path.join(__dirname, "..", "preload", "index.js");
  await createMainWindow({
    preloadPath,
    rendererUrl: "nion://app/index.html",
  });

  app.on("before-quit", () => {
    void supervisor.stop();
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void startDesktopMain();
}
