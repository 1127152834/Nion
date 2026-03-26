export const DESKTOP_BRIDGE_IPC_CHANNELS = {
  getSettings: "bridge:get-settings",
  saveSettings: "bridge:save-settings",
  getStatus: "bridge:get-status",
  listBindings: "bridge:list-bindings",
  start: "bridge:start",
  stop: "bridge:stop",
  probe: "bridge:probe",
  listWeixinAccounts: "bridge:list-weixin-accounts",
  startWeixinLogin: "bridge:start-weixin-login",
  waitForWeixinLogin: "bridge:wait-for-weixin-login",
  setWeixinAccountEnabled: "bridge:set-weixin-account-enabled",
  deleteWeixinAccount: "bridge:delete-weixin-account",
} as const;

export type DesktopBridgeStatus = {
  running: boolean;
  enabledPlatforms: string[];
  adapters: DesktopBridgeAdapterStatus[];
};

export type DesktopBridgeAdapterStatus = {
  platform: string;
  running: boolean;
  connectedAt: string | null;
  error: string | null;
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
