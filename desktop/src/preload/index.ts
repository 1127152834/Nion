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
    dialog: {
      openFolder: (options?: { defaultPath?: string; title?: string }) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.openFolder, options),
    },
    retrievalModels: {
      listRetrievalModels: () =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalModelsList),
      listRetrievalPacks: () =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalPacksList),
      downloadRetrievalModel: (modelId: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalModelDownload, modelId),
      cancelRetrievalModel: (modelId: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalModelCancel, modelId),
      removeRetrievalModel: (modelId: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalModelRemove, modelId),
      importRetrievalModel: (modelId: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalModelImport, modelId),
      downloadRetrievalPack: (packId: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalPackDownload, packId),
      cancelRetrievalPack: (packId: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalPackCancel, packId),
      removeRetrievalPack: (packId: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalPackRemove, packId),
      importRetrievalPack: (packId: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.retrievalPackImport, packId),
      onRetrievalModelDownloadProgress: (
        callback: (payload: unknown) => void,
      ) => {
        const listener = (_event: unknown, payload: unknown) => callback(payload);
        ipcRenderer.on(DESKTOP_IPC_CHANNELS.retrievalModelDownloadProgress, listener);
        return () => {
          ipcRenderer.removeListener(
            DESKTOP_IPC_CHANNELS.retrievalModelDownloadProgress,
            listener,
          );
        };
      },
    },
    terminal: {
      create: (options: { id: string; cwd: string; cols: number; rows: number }) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.terminalCreate, options),
      write: (id: string, data: string) =>
        ipcRenderer.send(DESKTOP_IPC_CHANNELS.terminalWrite, { id, data }),
      resize: (id: string, cols: number, rows: number) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.terminalResize, { id, cols, rows }),
      kill: (id: string) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.terminalKill, id),
      onData: (callback: (payload: { id: string; data: string }) => void) => {
        const listener = (_event: unknown, payload: { id: string; data: string }) =>
          callback(payload);
        ipcRenderer.on(DESKTOP_IPC_CHANNELS.terminalOnData, listener);
        return () => {
          ipcRenderer.removeListener(DESKTOP_IPC_CHANNELS.terminalOnData, listener);
        };
      },
      onExit: (callback: (payload: { id: string; code: number }) => void) => {
        const listener = (_event: unknown, payload: { id: string; code: number }) =>
          callback(payload);
        ipcRenderer.on(DESKTOP_IPC_CHANNELS.terminalOnExit, listener);
        return () => {
          ipcRenderer.removeListener(DESKTOP_IPC_CHANNELS.terminalOnExit, listener);
        };
      },
    },
    localActions: {
      execute: (plan: { actions: Array<{ action_type: string }> }) =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.localActionsExecute, plan),
      listHistory: () =>
        ipcRenderer.invoke(DESKTOP_IPC_CHANNELS.localActionsListHistory),
    },
    bridge: {
      getSettings: () => ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.getSettings),
      saveSettings: (updates: Record<string, string>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.saveSettings, updates),
      getRuntimeInfo: () =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.bridgeRuntimeInfo),
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
      startPlatform: (platform: string) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.startPlatform, platform),
      stopPlatform: (platform: string) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.stopPlatform, platform),
      probe: (platform: string) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.probe, platform),
      browseWorkingDirectory: (defaultPath?: string) =>
        ipcRenderer.invoke(
          DESKTOP_BRIDGE_IPC_CHANNELS.browseWorkingDirectory,
          defaultPath,
        ),
      verifyTelegram: (payload: Record<string, unknown>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.verifyTelegram, payload),
      detectTelegramChatId: (payload: Record<string, unknown>) =>
        ipcRenderer.invoke(
          DESKTOP_BRIDGE_IPC_CHANNELS.detectTelegramChatId,
          payload,
        ),
      verifyDiscord: (payload: Record<string, unknown>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.verifyDiscord, payload),
      verifyFeishu: (payload: Record<string, unknown>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.verifyFeishu, payload),
      verifyQq: (payload: Record<string, unknown>) =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.verifyQq, payload),
      verifyWeixin: () =>
        ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.verifyWeixin),
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
