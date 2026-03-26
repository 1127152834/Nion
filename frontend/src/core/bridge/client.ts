"use client";

export type BridgeStatus = {
  running: boolean;
  enabledPlatforms: string[];
  adapters: Array<{
    platform: string;
    running: boolean;
    connectedAt: string | null;
    error: string | null;
  }>;
};

export type BridgeBinding = {
  id: string;
  platform: string;
  chatId: string;
  threadId: string;
  workingDirectory: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BridgeProbeResult = {
  ok: boolean;
  message: string;
};

export type WeixinBridgeAccount = {
  accountId: string;
  userId: string;
  name: string;
  enabled: boolean;
  hasToken: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type WeixinBridgeLoginSession = {
  sessionId: string;
  qrImage: string;
  status: "waiting" | "scanned" | "confirmed" | "expired" | "failed";
  accountId?: string;
  error?: string;
};

export type BridgeClient = {
  getSettings(): Promise<Record<string, string>>;
  saveSettings(updates: Record<string, string>): Promise<void>;
  getStatus(): Promise<BridgeStatus>;
  listBindings(): Promise<BridgeBinding[]>;
  start(): Promise<void>;
  stop(): Promise<void>;
  probe(platform: string): Promise<BridgeProbeResult>;
  listWeixinAccounts(): Promise<WeixinBridgeAccount[]>;
  startWeixinLogin(): Promise<WeixinBridgeLoginSession>;
  waitForWeixinLogin(sessionId: string): Promise<WeixinBridgeLoginSession>;
  setWeixinAccountEnabled(accountId: string, enabled: boolean): Promise<void>;
  deleteWeixinAccount(accountId: string): Promise<void>;
};

function resolveDesktopBridge() {
  const bridge =
    typeof window !== "undefined"
      ? (
          window as Window & {
            nionDesktop?: {
              bridge?: {
                getSettings: () => Promise<Record<string, string>>;
                saveSettings: (updates: Record<string, string>) => Promise<void>;
                getStatus: () => Promise<BridgeStatus>;
                listBindings: () => Promise<BridgeBinding[]>;
                start: () => Promise<void>;
                stop: () => Promise<void>;
                probe: (platform: string) => Promise<BridgeProbeResult>;
                listWeixinAccounts: () => Promise<WeixinBridgeAccount[]>;
                startWeixinLogin: () => Promise<WeixinBridgeLoginSession>;
                waitForWeixinLogin: (sessionId: string) => Promise<WeixinBridgeLoginSession>;
                setWeixinAccountEnabled: (accountId: string, enabled: boolean) => Promise<void>;
                deleteWeixinAccount: (accountId: string) => Promise<void>;
              };
            };
          }
        ).nionDesktop?.bridge
      : undefined;

  return bridge;
}

export function getBridgeClient(): BridgeClient | null {
  const bridge = resolveDesktopBridge();
  if (!bridge) {
    return null;
  }

  return {
    getSettings: () => bridge.getSettings(),
    saveSettings: (updates) => bridge.saveSettings(updates),
    getStatus: () => bridge.getStatus(),
    listBindings: () => bridge.listBindings(),
    start: () => bridge.start(),
    stop: () => bridge.stop(),
    probe: (platform) => bridge.probe(platform),
    listWeixinAccounts: () => bridge.listWeixinAccounts(),
    startWeixinLogin: () => bridge.startWeixinLogin(),
    waitForWeixinLogin: (sessionId) => bridge.waitForWeixinLogin(sessionId),
    setWeixinAccountEnabled: (accountId, enabled) =>
      bridge.setWeixinAccountEnabled(accountId, enabled),
    deleteWeixinAccount: (accountId) => bridge.deleteWeixinAccount(accountId),
  };
}

export function createBridgeClient(): BridgeClient {
  const bridge = getBridgeClient();

  if (!bridge) {
    throw new Error("Desktop bridge API is unavailable");
  }

  return bridge;
}
