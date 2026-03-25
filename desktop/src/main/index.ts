import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain } from "electron";

import { createElectronClientSession, type ElectronClientSession } from "./daemon-client-session.js";
import { ensureLocalDaemon } from "./daemon-launcher.js";
import { buildDaemonCommand, resolveDesktopEnvironment } from "./config.js";
import { shouldAutoStartDesktopMain } from "./entrypoint.js";
import { registerDesktopProtocol } from "./protocol.js";
import { shouldKeepPrimaryInstance } from "./single-instance.js";
import { createDesktopUpdater, registerUpdaterHandlers } from "./updater.js";
import { createMainWindow, focusMainWindow } from "./window.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow: BrowserWindow | null = null;
let clientSession: ElectronClientSession | null = null;
let runtimeInfo: import("../shared/ipc.js").DesktopRuntimeInfo | null = null;

const lockAcquired = app.requestSingleInstanceLock();

if (!shouldKeepPrimaryInstance(lockAcquired)) {
  app.quit();
}

export async function startDesktopMain(): Promise<void> {
  if (!shouldKeepPrimaryInstance(lockAcquired)) {
    return;
  }

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

  const daemonCommand = buildDaemonCommand({
    appRoot: environment.appRoot,
    resourcesPath: environment.resourcesPath,
    userDataPath: environment.userDataPath,
    platform: environment.platform,
    packaged: app.isPackaged,
  });

  runtimeInfo = await ensureLocalDaemon(daemonCommand);
  process.env.NION_DESKTOP_BACKEND_URL = runtimeInfo.baseUrl;
  clientSession = await createElectronClientSession(runtimeInfo.baseUrl);
  runtimeInfo = {
    ...runtimeInfo,
    clientId: clientSession.clientId,
  };

  const updater = createDesktopUpdater();
  registerUpdaterHandlers(ipcMain, updater, () => {
    if (!runtimeInfo) {
      throw new Error("Desktop runtime info is unavailable");
    }
    return runtimeInfo;
  });

  const preloadPath = path.join(__dirname, "..", "preload", "index.js");
  mainWindow = await createMainWindow({
    preloadPath,
    rendererUrl: "nion://app/index.html",
  });

  mainWindow.on("closed", () => {
    void clientSession?.dispose();
    clientSession = null;
    mainWindow = null;
    app.quit();
  });

  app.on("second-instance", () => {
    focusMainWindow(mainWindow);
  });
}

if (shouldAutoStartDesktopMain(__filename)) {
  void startDesktopMain().catch((error) => {
    console.error("Failed to start desktop main process", error);
    app.exit(1);
  });
}
