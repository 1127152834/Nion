import { contextBridge, ipcRenderer } from "electron";

import { DESKTOP_IPC_CHANNELS } from "../shared/ipc.js";

export function registerPreloadBridge(): void {
  contextBridge.exposeInMainWorld("nionDesktop", {
    getRuntimeInfo: () => ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.runtimeInfo),
    checkForUpdates: () =>
      ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.checkForUpdates),
    quitAndInstallUpdate: () =>
      ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.quitAndInstallUpdate)
  });
}

declare global {
  interface Window {
    nionDesktop: {
      getRuntimeInfo: () => Promise<unknown>;
      checkForUpdates: () => Promise<unknown>;
      quitAndInstallUpdate: () => Promise<unknown>;
    };
  }
}
