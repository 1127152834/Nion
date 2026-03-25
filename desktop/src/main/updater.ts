import type { IpcMain } from "electron";

import { DESKTOP_IPC_CHANNELS, type DesktopRuntimeInfo, type DesktopUpdateResult } from "../shared/ipc.js";
import { idleUpdateStatus, resolveUpdateFeed } from "./update-feed.js";

export type DesktopUpdater = {
  checkForUpdates: () => Promise<DesktopUpdateResult>;
  quitAndInstall: () => Promise<boolean>;
};

export function createDesktopUpdater(): DesktopUpdater {
  const feed = resolveUpdateFeed();

  return {
    async checkForUpdates() {
      return idleUpdateStatus(feed);
    },
    async quitAndInstall() {
      return false;
    },
  };
}

export function registerUpdaterHandlers(
  ipcMain: IpcMain,
  updater: DesktopUpdater,
  getRuntimeInfo: () => DesktopRuntimeInfo,
): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.runtimeInfo, async () => getRuntimeInfo());
  ipcMain.handle(DESKTOP_IPC_CHANNELS.checkForUpdates, async () => updater.checkForUpdates());
  ipcMain.handle(DESKTOP_IPC_CHANNELS.quitAndInstallUpdate, async () => updater.quitAndInstall());
}
