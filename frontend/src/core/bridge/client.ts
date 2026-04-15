"use client";

export type BridgeStatus = {
  running: boolean;
  startedAt: string | null;
  enabledPlatforms: string[];
  adapters: Array<{
    platform: string;
    channelType: string;
    running: boolean;
    connectedAt: string | null;
    lastMessageAt: string | null;
    error: string | null;
  }>;
};

export type BridgeRuntimeInfo = {
  running: boolean;
  autoStartEnabled: boolean;
  enabledPlatforms: string[];
  activeBindings: number;
  openIncidents: number;
  startedAt: string | null;
};

export type BridgeBinding = {
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

export type BridgeProbeResult = {
  ok: boolean;
  message: string;
  error?: string;
};

export type BridgeVerifyResult = {
  verified: boolean;
  botName?: string;
  gatewayUrl?: string;
  error?: string;
};

export type BridgeDetectChatIdResult = {
  ok: boolean;
  chatId?: string;
  chatTitle?: string;
  error?: string;
};

export type ProviderModelGroup = {
  provider_id: string;
  provider_name: string;
  models: Array<{
    value: string;
    label: string;
  }>;
};

export type BridgeRecommendedAction = {
  actionId: string;
  actionType: string;
  label: string;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  requiresConfirmation: boolean;
  executableNow: boolean;
  scope: "global" | "adapter" | "binding";
  platform: string | null;
  bindingId: string | null;
  ipcChannel: string | null;
  ipcArgs: Record<string, unknown>;
  expectedOutcome: string;
};

export type BridgeExecutedAction = {
  actionId: string;
  executedAt: string;
  status: "completed" | "failed";
  resultSummary: string;
};

export type BridgeIncidentRecord = {
  incidentId: string;
  createdAt: string;
  updatedAt: string;
  source: "bridge_page" | "chat" | "automatic";
  incidentType:
    | "bridge_manager_down"
    | "adapter_start_failure"
    | "adapter_runtime_failure"
    | "bridge_delivery_failure"
    | "binding_resolution_error"
    | "permission_workflow_stuck";
  severity: "info" | "warning" | "error";
  status: "open" | "resolved" | "dismissed";
  adapterPlatform: string | null;
  bindingId: string | null;
  threadId: string | null;
  summary: string;
  userVisibleExplanation: string;
  rootCauseHypothesis: string | null;
  confidence: number | null;
  recommendedActions: BridgeRecommendedAction[];
  executedActions: BridgeExecutedAction[];
  evidence: Record<string, unknown>;
  resolutionNote: string | null;
};

export type BridgeIncidentFilters = {
  status?: "open" | "resolved" | "dismissed";
  severity?: "info" | "warning" | "error";
  adapterPlatform?: string;
  incidentType?: BridgeIncidentRecord["incidentType"];
  limit?: number;
};

export type BridgeDiagnoseRequest = {
  source: "bridge_page" | "chat" | "automatic";
  adapterPlatform?: string | null;
  bindingId?: string | null;
  threadId?: string | null;
};

export type BridgeRunActionRequest = {
  incidentId: string;
  actionId: string;
};

export type BridgeRunActionResult = {
  ok: boolean;
  actionId: string;
  status: "completed" | "failed" | "rejected";
  resultSummary: string;
  incident: BridgeIncidentRecord | null;
  payload?: Record<string, unknown>;
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
  bridgeRestartError?: string;
};

export type WeixinBridgeMutationResult = {
  ok: boolean;
  accountUpdated?: boolean;
  accountDeleted?: boolean;
  error?: string;
};

export type BridgeClient = {
  getSettings(): Promise<Record<string, string>>;
  saveSettings(updates: Record<string, string>): Promise<void>;
  getRuntimeInfo(): Promise<BridgeRuntimeInfo>;
  getStatus(): Promise<BridgeStatus>;
  listBindings(): Promise<BridgeBinding[]>;
  listIncidents(filters?: BridgeIncidentFilters): Promise<BridgeIncidentRecord[]>;
  getIncident(incidentId: string): Promise<BridgeIncidentRecord | null>;
  diagnose(request: BridgeDiagnoseRequest): Promise<BridgeIncidentRecord>;
  dismissIncident(incidentId: string): Promise<BridgeIncidentRecord | null>;
  runAction(request: BridgeRunActionRequest): Promise<BridgeRunActionResult>;
  start(): Promise<string | null>;
  stop(): Promise<void>;
  startPlatform(platform: string): Promise<string | null>;
  stopPlatform(platform: string): Promise<void>;
  probe(platform: string): Promise<BridgeProbeResult>;
  browseWorkingDirectory(defaultPath?: string): Promise<string | null>;
  verifyTelegram(payload: {
    bot_token?: string;
    chat_id?: string;
  }): Promise<BridgeVerifyResult>;
  detectTelegramChatId(payload: {
    bot_token?: string;
  }): Promise<BridgeDetectChatIdResult>;
  verifyDiscord(payload: {
    bot_token?: string;
  }): Promise<BridgeVerifyResult>;
  verifyFeishu(payload: {
    app_id?: string;
    app_secret?: string;
    domain?: string;
  }): Promise<BridgeVerifyResult>;
  verifyQq(payload: {
    app_id?: string;
    app_secret?: string;
  }): Promise<BridgeVerifyResult>;
  verifyWeixin(): Promise<BridgeVerifyResult>;
  listWeixinAccounts(): Promise<WeixinBridgeAccount[]>;
  startWeixinLogin(): Promise<WeixinBridgeLoginSession>;
  waitForWeixinLogin(sessionId: string): Promise<WeixinBridgeLoginSession>;
  setWeixinAccountEnabled(
    accountId: string,
    enabled: boolean,
  ): Promise<WeixinBridgeMutationResult>;
  deleteWeixinAccount(accountId: string): Promise<WeixinBridgeMutationResult>;
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
                getRuntimeInfo?: () => Promise<BridgeRuntimeInfo>;
                getStatus: () => Promise<BridgeStatus>;
                listBindings: () => Promise<BridgeBinding[]>;
                listIncidents: (filters?: BridgeIncidentFilters) => Promise<BridgeIncidentRecord[]>;
                getIncident: (incidentId: string) => Promise<BridgeIncidentRecord | null>;
                diagnose: (request: BridgeDiagnoseRequest) => Promise<BridgeIncidentRecord>;
                dismissIncident: (incidentId: string) => Promise<BridgeIncidentRecord | null>;
                runAction: (request: BridgeRunActionRequest) => Promise<BridgeRunActionResult>;
                start: () => Promise<string | null>;
                stop: () => Promise<void>;
                startPlatform: (platform: string) => Promise<string | null>;
                stopPlatform: (platform: string) => Promise<void>;
                probe: (platform: string) => Promise<BridgeProbeResult>;
                browseWorkingDirectory: (defaultPath?: string) => Promise<string | null>;
                verifyTelegram: (payload: {
                  bot_token?: string;
                  chat_id?: string;
                }) => Promise<BridgeVerifyResult>;
                detectTelegramChatId: (payload: {
                  bot_token?: string;
                }) => Promise<BridgeDetectChatIdResult>;
                verifyDiscord: (payload: {
                  bot_token?: string;
                }) => Promise<BridgeVerifyResult>;
                verifyFeishu: (payload: {
                  app_id?: string;
                  app_secret?: string;
                  domain?: string;
                }) => Promise<BridgeVerifyResult>;
                verifyQq: (payload: {
                  app_id?: string;
                  app_secret?: string;
                }) => Promise<BridgeVerifyResult>;
                verifyWeixin: () => Promise<BridgeVerifyResult>;
                listWeixinAccounts: () => Promise<WeixinBridgeAccount[]>;
                startWeixinLogin: () => Promise<WeixinBridgeLoginSession>;
                waitForWeixinLogin: (sessionId: string) => Promise<WeixinBridgeLoginSession>;
                setWeixinAccountEnabled: (
                  accountId: string,
                  enabled: boolean,
                ) => Promise<WeixinBridgeMutationResult>;
                deleteWeixinAccount: (
                  accountId: string,
                ) => Promise<WeixinBridgeMutationResult>;
              };
            };
          }
        ).nionDesktop?.bridge
      : undefined;

  return bridge;
}

let cachedBridgeClient: BridgeClient | null | undefined;
let cachedDesktopBridge:
  | ReturnType<typeof resolveDesktopBridge>
  | undefined;

export function getBridgeClient(): BridgeClient | null {
  const bridge = resolveDesktopBridge();
  if (!bridge) {
    cachedDesktopBridge = bridge;
    cachedBridgeClient = null;
    return null;
  }

  if (cachedBridgeClient !== undefined && cachedDesktopBridge === bridge) {
    return cachedBridgeClient;
  }

  cachedDesktopBridge = bridge;
  cachedBridgeClient = {
    getSettings: () => bridge.getSettings(),
    saveSettings: (updates) => bridge.saveSettings(updates),
    getRuntimeInfo: () => {
      if (!bridge.getRuntimeInfo) {
        throw new Error("Desktop bridge runtime overview API is unavailable");
      }

      return bridge.getRuntimeInfo();
    },
    getStatus: () => bridge.getStatus(),
    listBindings: () => bridge.listBindings(),
    listIncidents: (filters) => bridge.listIncidents(filters),
    getIncident: (incidentId) => bridge.getIncident(incidentId),
    diagnose: (request) => bridge.diagnose(request),
    dismissIncident: (incidentId) => bridge.dismissIncident(incidentId),
    runAction: (request) => bridge.runAction(request),
    start: () => bridge.start(),
    stop: () => bridge.stop(),
    startPlatform: (platform) => bridge.startPlatform(platform),
    stopPlatform: (platform) => bridge.stopPlatform(platform),
    probe: (platform) => bridge.probe(platform),
    browseWorkingDirectory: (defaultPath) =>
      bridge.browseWorkingDirectory(defaultPath),
    verifyTelegram: (payload) => bridge.verifyTelegram(payload),
    detectTelegramChatId: (payload) => bridge.detectTelegramChatId(payload),
    verifyDiscord: (payload) => bridge.verifyDiscord(payload),
    verifyFeishu: (payload) => bridge.verifyFeishu(payload),
    verifyQq: (payload) => bridge.verifyQq(payload),
    verifyWeixin: () => bridge.verifyWeixin(),
    listWeixinAccounts: () => bridge.listWeixinAccounts(),
    startWeixinLogin: () => bridge.startWeixinLogin(),
    waitForWeixinLogin: (sessionId) => bridge.waitForWeixinLogin(sessionId),
    setWeixinAccountEnabled: (accountId, enabled) =>
      bridge.setWeixinAccountEnabled(accountId, enabled),
    deleteWeixinAccount: (accountId) => bridge.deleteWeixinAccount(accountId),
  };

  return cachedBridgeClient;
}

export function createBridgeClient(): BridgeClient {
  const bridge = getBridgeClient();

  if (!bridge) {
    throw new Error("Desktop bridge API is unavailable");
  }

  return bridge;
}
