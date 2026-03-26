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
  listIncidents: "bridge:list-incidents",
  getIncident: "bridge:get-incident",
  diagnose: "bridge:diagnose",
  dismissIncident: "bridge:dismiss-incident",
  runAction: "bridge:run-action",
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

export type DesktopBridgeIncidentSource = "bridge_page" | "chat" | "automatic";

export type DesktopBridgeIncidentStatus = "open" | "resolved" | "dismissed";

export type DesktopBridgeIncidentSeverity = "info" | "warning" | "error";

export type DesktopBridgeIncidentType =
  | "bridge_manager_down"
  | "adapter_start_failure"
  | "adapter_runtime_failure"
  | "bridge_delivery_failure"
  | "binding_resolution_error"
  | "permission_workflow_stuck";

export type DesktopBridgeObservationType =
  | "bridge_manager_started"
  | "bridge_manager_stopped"
  | "bridge_manager_start_failed"
  | "adapter_start_failed"
  | "adapter_runtime_error"
  | "adapter_probe_failed"
  | "binding_resolved"
  | "binding_resolution_failed"
  | "permission_request_emitted"
  | "permission_request_resolved"
  | "permission_request_timed_out"
  | "bridge_delivery_failed";

export type DesktopBridgeObservationLevel = "info" | "warning" | "error";

export type DesktopBridgeRecommendedAction = {
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

export type DesktopBridgeExecutedAction = {
  actionId: string;
  executedAt: string;
  status: "completed" | "failed";
  resultSummary: string;
};

export type DesktopBridgeObservationRecord = {
  observationId: string;
  timestamp: string;
  observationType: DesktopBridgeObservationType;
  level: DesktopBridgeObservationLevel;
  adapterPlatform: string | null;
  bindingId: string | null;
  threadId: string | null;
  summary: string;
  details: Record<string, unknown>;
};

export type DesktopBridgeIncidentRecord = {
  incidentId: string;
  createdAt: string;
  updatedAt: string;
  source: DesktopBridgeIncidentSource;
  incidentType: DesktopBridgeIncidentType;
  severity: DesktopBridgeIncidentSeverity;
  status: DesktopBridgeIncidentStatus;
  adapterPlatform: string | null;
  bindingId: string | null;
  threadId: string | null;
  summary: string;
  userVisibleExplanation: string;
  rootCauseHypothesis: string | null;
  confidence: number | null;
  recommendedActions: DesktopBridgeRecommendedAction[];
  executedActions: DesktopBridgeExecutedAction[];
  evidence: Record<string, unknown>;
  resolutionNote: string | null;
};

export type DesktopBridgeIncidentFilters = {
  status?: DesktopBridgeIncidentStatus;
  severity?: DesktopBridgeIncidentSeverity;
  adapterPlatform?: string;
  incidentType?: DesktopBridgeIncidentType;
  limit?: number;
};

export type DesktopBridgeDiagnoseRequest = {
  source: DesktopBridgeIncidentSource;
  adapterPlatform?: string | null;
  bindingId?: string | null;
  threadId?: string | null;
};
