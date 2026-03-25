import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain } from "electron";

import { createBackendSupervisor } from "./backend-supervisor.js";
import { resolveDesktopEnvironment } from "./config.js";
import { shouldAutoStartDesktopMain } from "./entrypoint.js";
import { registerDesktopProtocol } from "./protocol.js";
import { createDesktopUpdater, registerUpdaterHandlers } from "./updater.js";
import { createMainWindow } from "./window.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow: BrowserWindow | null = null;

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
  process.env.NION_DESKTOP_BACKEND_URL = supervisor.getRuntimeInfo().baseUrl;

  const updater = createDesktopUpdater();
  registerUpdaterHandlers(ipcMain, updater, () => supervisor.getRuntimeInfo());

  const preloadPath = path.join(__dirname, "..", "preload", "index.js");
  mainWindow = await createMainWindow({
    preloadPath,
    rendererUrl: "nion://app/index.html",
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length > 0) {
      return;
    }

    mainWindow = await createMainWindow({
      preloadPath,
      rendererUrl: "nion://app/index.html",
    });
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  });

  app.on("before-quit", () => {
    void supervisor.stop();
  });
}

if (shouldAutoStartDesktopMain(__filename)) {
  void startDesktopMain().catch((error) => {
    console.error("Failed to start desktop main process", error);
    app.exit(1);
  });
}
