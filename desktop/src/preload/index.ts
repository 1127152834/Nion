import { contextBridge, ipcRenderer } from "electron";

import { DESKTOP_IPC_CHANNELS } from "../shared/ipc.js";

export function registerPreloadBridge(): void {
  const backendBaseUrl = process.env.NION_DESKTOP_BACKEND_URL ?? "";

  if (backendBaseUrl) {
    contextBridge.exposeInMainWorld("__NION_BACKEND_BASE_URL__", backendBaseUrl);
  }

  contextBridge.exposeInMainWorld("nionDesktop", {
    backendBaseUrl,
    getRuntimeInfo: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.runtimeInfo),
    checkForUpdates: () =>
      ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.checkForUpdates),
    quitAndInstallUpdate: () =>
      ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.quitAndInstallUpdate)
  });
}

registerPreloadBridge();
