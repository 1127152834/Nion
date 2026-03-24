import type { IpcMain } from "electron";

import type { BackendRuntimeInfo } from "./backend-supervisor.js";
import { DESKTOP_IPC_CHANNELS, type DesktopUpdateResult } from "../shared/ipc.js";

export type DesktopUpdater = {
  checkForUpdates: () => Promise<DesktopUpdateResult>;
  quitAndInstall: () => Promise<boolean>;
};

export function createDesktopUpdater(): DesktopUpdater {
  return {
    async checkForUpdates() {
      return {
        provider: "github",
        status: "idle",
        message: "Auto-update wiring will be added in a later task.",
      };
    },
    async quitAndInstall() {
      return false;
    },
  };
}

export function registerUpdaterHandlers(
  ipcMain: IpcMain,
  updater: DesktopUpdater,
  getRuntimeInfo: () => BackendRuntimeInfo,
): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.runtimeInfo, async () => getRuntimeInfo());
  ipcMain.handle(DESKTOP_IPC_CHANNELS.checkForUpdates, async () => updater.checkForUpdates());
  ipcMain.handle(DESKTOP_IPC_CHANNELS.quitAndInstallUpdate, async () => updater.quitAndInstall());
}
