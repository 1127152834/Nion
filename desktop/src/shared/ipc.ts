export const DESKTOP_IPC_CHANNELS = {
  runtimeInfo: "desktop:get-runtime-info",
  checkForUpdates: "desktop:check-for-updates",
  quitAndInstallUpdate: "desktop:quit-and-install-update",
} as const;

export type DesktopRuntimeInfo = {
  running: boolean;
  pid: number | null;
  baseUrl: string;
  healthUrl: string;
};

export type DesktopUpdateResult = {
  provider: "github" | "generic";
  status: "idle" | "checking" | "downloaded" | "unavailable";
  message: string;
};

declare global {
  interface Window {
    __NION_BACKEND_BASE_URL__?: string;
    nionDesktop: {
      backendBaseUrl: string;
      getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
      checkForUpdates: () => Promise<DesktopUpdateResult>;
      quitAndInstallUpdate: () => Promise<boolean>;
    };
  }
}
