export const DESKTOP_IPC_CHANNELS = {
  runtimeInfo: "desktop:get-runtime-info",
  checkForUpdates: "desktop:check-for-updates",
  quitAndInstallUpdate: "desktop:quit-and-install-update",
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

export type DesktopBridgeStatus = {
  running: boolean;
  enabledPlatforms: string[];
};

export type DesktopBridgeBinding = {
  id: string;
  platform: string;
  chatId: string;
  threadId: string;
  workingDirectory: string;
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
};

declare global {
  interface Window {
    __NION_BACKEND_BASE_URL__?: string;
    nionDesktop: {
      backendBaseUrl: string;
      bridge: {
        getSettings: () => Promise<Record<string, string>>;
        saveSettings: (updates: Record<string, string>) => Promise<void>;
        getStatus: () => Promise<DesktopBridgeStatus>;
        listBindings: () => Promise<DesktopBridgeBinding[]>;
        start: () => Promise<void>;
        stop: () => Promise<void>;
        probe: (platform: string) => Promise<DesktopBridgeProbeResult>;
        listWeixinAccounts: () => Promise<DesktopWeixinAccount[]>;
        startWeixinLogin: () => Promise<DesktopWeixinLoginSession>;
        waitForWeixinLogin: (sessionId: string) => Promise<DesktopWeixinLoginSession>;
        setWeixinAccountEnabled: (accountId: string, enabled: boolean) => Promise<void>;
        deleteWeixinAccount: (accountId: string) => Promise<void>;
      };
      getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
      checkForUpdates: () => Promise<DesktopUpdateResult>;
      quitAndInstallUpdate: () => Promise<boolean>;
    };
  }
}
