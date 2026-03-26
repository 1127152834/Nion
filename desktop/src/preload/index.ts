import { contextBridge, ipcRenderer } from "electron";

import { DESKTOP_BRIDGE_IPC_CHANNELS } from "../shared/bridge-ipc.js";
import { DESKTOP_IPC_CHANNELS } from "../shared/ipc.js";

export function registerPreloadBridge(): void {
  const backendBaseUrl = process.env.NION_DESKTOP_BACKEND_URL ?? "";

  if (backendBaseUrl) {
    contextBridge.exposeInMainWorld("__NION_BACKEND_BASE_URL__", backendBaseUrl);
  }

  contextBridge.exposeInMainWorld("nionDesktop", {
    backendBaseUrl,
    bridge: {
      getSettings: () => ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.getSettings),
      saveSettings: (updates: Record<string, string>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.saveSettings, updates),
      getStatus: () => ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.getStatus),
      listBindings: () => ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.listBindings),
      listIncidents: (filters?: Record<string, unknown>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.listIncidents, filters),
      getIncident: (incidentId: string) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.getIncident, incidentId),
      diagnose: (request: Record<string, unknown>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.diagnose, request),
      dismissIncident: (incidentId: string) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.dismissIncident, incidentId),
      runAction: (request: Record<string, unknown>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.runAction, request),
      start: () => ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.start),
      stop: () => ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.stop),
      probe: (platform: string) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.probe, platform),
      listWeixinAccounts: () =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.listWeixinAccounts),
      startWeixinLogin: () =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.startWeixinLogin),
      waitForWeixinLogin: (sessionId: string) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.waitForWeixinLogin, sessionId),
      setWeixinAccountEnabled: (accountId: string, enabled: boolean) =>
        ipcRenderer.invoke(
          DESKTOP_BRIDGE_IPC_CHANNELS.setWeixinAccountEnabled,
          accountId,
          enabled,
        ),
      deleteWeixinAccount: (accountId: string) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.deleteWeixinAccount, accountId),
    },
    getRuntimeInfo: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.runtimeInfo),
    checkForUpdates: () =>
      ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.checkForUpdates),
    quitAndInstallUpdate: () =>
      ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.quitAndInstallUpdate)
  });
}

registerPreloadBridge();
