import path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain } from "electron";

import { createBridgeManager } from "./bridge/bridge-manager.js";
import { createBridgeBindingsStore } from "./bridge/bindings-store.js";
import { createBridgeIncidentController } from "./bridge/incident-playbooks.js";
import { createBridgeIncidentsStore } from "./bridge/incidents-store.js";
import { createBridgeObservationsStore } from "./bridge/observations-store.js";
import { createBridgeOffsetStore } from "./bridge/offset-store.js";
import { createBridgeSettingsStore } from "./bridge/settings-store.js";
import { createWeixinAuthManager } from "./bridge/weixin/auth.js";
import { createWeixinBridgeStore } from "./bridge/weixin-store.js";
import { createElectronClientSession, type ElectronClientSession } from "./daemon-client-session.js";
import { ensureLocalDaemon } from "./daemon-launcher.js";
import { buildDaemonCommand, resolveDesktopEnvironment } from "./config.js";
import { shouldAutoStartDesktopMain } from "./entrypoint.js";
import { registerDesktopProtocol } from "./protocol.js";
import { shouldKeepPrimaryInstance } from "./single-instance.js";
import { createDesktopUpdater, registerUpdaterHandlers } from "./updater.js";
import { createMainWindow, focusMainWindow } from "./window.js";
import { DESKTOP_BRIDGE_IPC_CHANNELS } from "../shared/bridge-ipc.js";

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

  const bridgeSettingsStore = createBridgeSettingsStore(
    path.join(environment.userDataPath, "bridge", "settings.json"),
  );
  const bridgeBindingsStore = createBridgeBindingsStore(
    path.join(environment.userDataPath, "bridge", "bindings.json"),
  );
  const bridgeOffsetStore = createBridgeOffsetStore(
    path.join(environment.userDataPath, "bridge", "offsets.json"),
  );
  const bridgeObservationsStore = createBridgeObservationsStore(
    path.join(environment.userDataPath, "bridge", "observations.json"),
  );
  const bridgeIncidentsStore = createBridgeIncidentsStore(
    path.join(environment.userDataPath, "bridge", "incidents.json"),
  );
  const weixinBridgeStore = createWeixinBridgeStore(
    path.join(environment.userDataPath, "bridge", "weixin.json"),
  );
  const weixinAuthManager = createWeixinAuthManager({
    upsertAccount: (account) => weixinBridgeStore.upsertAccount(account),
  });
  const bridgeManager = createBridgeManager({
    loadSettings: () => bridgeSettingsStore.loadSettings(),
    listBindings: () => bridgeBindingsStore.listBindings(),
    upsertBinding: (binding) => bridgeBindingsStore.upsertBinding(binding),
    defaultWorkingDirectory: () =>
      bridgeSettingsStore.loadSettings().settings.bridge_default_work_dir ?? "",
    backendBaseUrl: runtimeInfo.baseUrl,
    offsetStore: bridgeOffsetStore,
    weixinStore: weixinBridgeStore,
    recordObservation: (observation) => bridgeObservationsStore.appendObservation(observation),
  });
  const bridgeIncidentController = createBridgeIncidentController({
    getStatus: () => bridgeManager.getStatus(),
    loadSettings: () => bridgeSettingsStore.loadSettings(),
    listBindings: () => bridgeBindingsStore.listBindings(),
    listWeixinAccounts: () =>
      weixinBridgeStore.listAccounts().map((account) => ({
        accountId: account.accountId,
        userId: account.userId,
        name: account.name,
        enabled: account.enabled,
        hasToken: Boolean(account.token),
        lastLoginAt: account.lastLoginAt,
        createdAt: account.createdAt,
      })),
    listObservations: (filters) => bridgeObservationsStore.listObservations(filters),
    incidentStore: bridgeIncidentsStore,
  });
  const restartBridgeIfRunning = async () => {
    if (!bridgeManager.getStatus().running) {
      return;
    }
    await bridgeManager.stop();
    await bridgeManager.start();
  };

  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.getSettings, () => {
    return bridgeSettingsStore.loadSettings().settings;
  });
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.saveSettings,
    (_event, updates: Record<string, string>) => {
      const current = bridgeSettingsStore.loadSettings().settings;
      bridgeSettingsStore.saveSettings({ ...current, ...updates });
    },
  );
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.getStatus, () => {
    return bridgeManager.getStatus();
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.listBindings, () => {
    return bridgeBindingsStore.listBindings();
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.listIncidents, (_event, filters) => {
    return bridgeIncidentController.listIncidents(filters);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.getIncident, (_event, incidentId: string) => {
    return bridgeIncidentController.getIncident(incidentId);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.diagnose, (_event, request) => {
    return bridgeIncidentController.diagnose(request);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.dismissIncident, (_event, incidentId: string) => {
    return bridgeIncidentController.dismissIncident(incidentId);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.start, async () => {
    await bridgeManager.start();
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.stop, async () => {
    await bridgeManager.stop();
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.probe, async (_event, platform: string) => {
    return bridgeManager.probePlatform(platform);
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.listWeixinAccounts, () => {
    return weixinBridgeStore.listAccounts().map((account) => ({
      accountId: account.accountId,
      userId: account.userId,
      name: account.name,
      enabled: account.enabled,
      hasToken: Boolean(account.token),
      lastLoginAt: account.lastLoginAt,
      createdAt: account.createdAt,
    }));
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.startWeixinLogin, async () => {
    const session = await weixinAuthManager.startLogin();
    return {
      sessionId: session.sessionId,
      qrImage: session.qrImage,
      status: session.status,
      accountId: session.accountId,
      error: session.error,
    };
  });
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.waitForWeixinLogin, async (_event, sessionId: string) => {
    const session = await weixinAuthManager.waitForLogin(sessionId);
    if (session.status === "confirmed") {
      await restartBridgeIfRunning();
    }
    return {
      sessionId: session.sessionId,
      qrImage: session.qrImage,
      status: session.status,
      accountId: session.accountId,
      error: session.error,
    };
  });
  ipcMain.handle(
    DESKTOP_BRIDGE_IPC_CHANNELS.setWeixinAccountEnabled,
    async (_event, accountId: string, enabled: boolean) => {
      weixinBridgeStore.setAccountEnabled(accountId, enabled);
      await restartBridgeIfRunning();
    },
  );
  ipcMain.handle(DESKTOP_BRIDGE_IPC_CHANNELS.deleteWeixinAccount, async (_event, accountId: string) => {
    weixinBridgeStore.deleteAccount(accountId);
    await restartBridgeIfRunning();
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
