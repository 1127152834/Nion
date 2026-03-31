export const DESKTOP_IPC_CHANNELS = {
  runtimeInfo: "desktop:get-runtime-info",
  checkForUpdates: "desktop:check-for-updates",
  quitAndInstallUpdate: "desktop:quit-and-install-update",
  openFolder: "desktop:open-folder",
  terminalCreate: "desktop:terminal-create",
  terminalWrite: "desktop:terminal-write",
  terminalResize: "desktop:terminal-resize",
  terminalKill: "desktop:terminal-kill",
  terminalOnData: "desktop:terminal-data",
  terminalOnExit: "desktop:terminal-exit",
} as const;

export type DesktopRuntimeInfo = {
  mode: "local-daemon";
  baseUrl: string;
  healthUrl: string;
  workingDirectory: string | null;
  clientId: string | null;
  allowBackgroundRunning: boolean;
};

export type DesktopUpdateResult = {
  provider: "github" | "generic";
  status: "idle" | "checking" | "downloaded" | "unavailable";
  message: string;
};

export type DesktopOpenFolderResult = {
  canceled: boolean;
  filePaths: string[];
};

export type DesktopTerminalDataEvent = {
  id: string;
  data: string;
};

export type DesktopTerminalExitEvent = {
  id: string;
  code: number;
};

export type DesktopBridgeStatus = {
  running: boolean;
  startedAt: string | null;
  enabledPlatforms: string[];
  adapters?: Array<{
    platform: string;
    channelType: string;
    running: boolean;
    connectedAt: string | null;
    lastMessageAt: string | null;
    error: string | null;
  }>;
};

export type DesktopBridgeBinding = {
  id: string;
  platform: string;
  chatId: string;
  threadId: string;
  workingDirectory: string;
  model?: string;
  mode?: "code" | "plan" | "ask";
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DesktopBridgeProbeResult = {
  ok: boolean;
  message: string;
};

export type DesktopWeixinAccount = {
  accountId: string;
  userId: string;
  name: string;
  enabled: boolean;
  hasToken: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type DesktopWeixinLoginSession = {
  sessionId: string;
  qrImage: string;
  status: "waiting" | "scanned" | "confirmed" | "expired" | "failed";
  accountId?: string;
  error?: string;
  bridgeRestartError?: string;
};

declare global {
  interface Window {
    __NION_BACKEND_BASE_URL__?: string;
    nionDesktop: {
      backendBaseUrl: string;
      dialog?: {
        openFolder: (options?: {
          defaultPath?: string;
          title?: string;
        }) => Promise<DesktopOpenFolderResult>;
      };
      terminal?: {
        create: (options: {
          id: string;
          cwd: string;
          cols: number;
          rows: number;
        }) => Promise<void>;
        write: (id: string, data: string) => void;
        resize: (id: string, cols: number, rows: number) => Promise<void>;
        kill: (id: string) => Promise<void>;
        onData: (
          callback: (payload: DesktopTerminalDataEvent) => void,
        ) => () => void;
        onExit: (
          callback: (payload: DesktopTerminalExitEvent) => void,
        ) => () => void;
      };
      bridge: {
        getSettings: () => Promise<Record<string, string>>;
        saveSettings: (updates: Record<string, string>) => Promise<void>;
        getStatus: () => Promise<DesktopBridgeStatus>;
        listBindings: () => Promise<DesktopBridgeBinding[]>;
        start: () => Promise<string | null>;
        stop: () => Promise<void>;
        startPlatform: (platform: string) => Promise<string | null>;
        stopPlatform: (platform: string) => Promise<void>;
        probe: (platform: string) => Promise<DesktopBridgeProbeResult>;
        browseWorkingDirectory: (defaultPath?: string) => Promise<string | null>;
        verifyTelegram: (payload: {
          bot_token?: string;
          chat_id?: string;
        }) => Promise<{
          verified: boolean;
          botName?: string;
          error?: string;
        }>;
        detectTelegramChatId: (payload: {
          bot_token?: string;
        }) => Promise<{
          ok: boolean;
          chatId?: string;
          chatTitle?: string;
          error?: string;
        }>;
        verifyDiscord: (payload: {
          bot_token?: string;
        }) => Promise<{
          verified: boolean;
          botName?: string;
          error?: string;
        }>;
        verifyFeishu: (payload: {
          app_id?: string;
          app_secret?: string;
          domain?: string;
        }) => Promise<{
          verified: boolean;
          botName?: string;
          error?: string;
        }>;
        verifyQq: (payload: {
          app_id?: string;
          app_secret?: string;
        }) => Promise<{
          verified: boolean;
          gatewayUrl?: string;
          error?: string;
        }>;
        verifyWeixin: () => Promise<{
          verified: boolean;
          botName?: string;
          error?: string;
        }>;
        listWeixinAccounts: () => Promise<DesktopWeixinAccount[]>;
        startWeixinLogin: () => Promise<DesktopWeixinLoginSession>;
        waitForWeixinLogin: (sessionId: string) => Promise<DesktopWeixinLoginSession>;
        setWeixinAccountEnabled: (
          accountId: string,
          enabled: boolean,
        ) => Promise<{
          ok: boolean;
          accountUpdated?: boolean;
          error?: string;
        }>;
        deleteWeixinAccount: (accountId: string) => Promise<{
          ok: boolean;
          accountDeleted?: boolean;
          error?: string;
        }>;
      };
      getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
      checkForUpdates: () => Promise<DesktopUpdateResult>;
      quitAndInstallUpdate: () => Promise<boolean>;
    };
  }
}
