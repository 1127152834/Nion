import type {
  DesktopBridgeAdapterStatus,
  DesktopBridgeDiagnoseRequest,
  DesktopBridgeExecutedAction,
  DesktopBridgeIncidentFilters,
  DesktopBridgeIncidentRecord,
  DesktopBridgeIncidentSeverity,
  DesktopBridgeIncidentType,
  DesktopBridgeObservationRecord,
  DesktopBridgeRecommendedAction,
  DesktopBridgeStatus,
  DesktopWeixinAccount,
} from "../../shared/bridge-ipc.js";
import type {
  BridgeIncidentInput,
  BridgeIncidentRecord,
} from "./incidents-store.js";
import type { BridgeBinding } from "./bindings-store.js";

type BridgeRuntimeContext = {
  status: DesktopBridgeStatus;
  settings: Record<string, string>;
  bindings: BridgeBinding[];
  weixinAccounts: DesktopWeixinAccount[];
  observations: DesktopBridgeObservationRecord[];
};

type BridgeIncidentControllerDependencies = {
  getStatus: () => DesktopBridgeStatus;
  loadSettings: () => { settings: Record<string, string> };
  listBindings: () => BridgeBinding[];
  listWeixinAccounts: () => DesktopWeixinAccount[];
  listObservations: (filters?: {
    adapterPlatform?: string;
    limit?: number;
  }) => DesktopBridgeObservationRecord[];
  incidentStore: {
    recordIncident: (input: BridgeIncidentInput) => BridgeIncidentRecord;
    listIncidents: (filters?: DesktopBridgeIncidentFilters) => BridgeIncidentRecord[];
    getIncident: (incidentId: string) => BridgeIncidentRecord | null;
    dismissIncident: (incidentId: string) => BridgeIncidentRecord | null;
    appendExecutedAction?: (
      incidentId: string,
      action: DesktopBridgeExecutedAction,
    ) => BridgeIncidentRecord | null;
  };
};

const INCIDENT_ACTIONS = {
  restartBridge: {
    actionType: "restart_bridge_runtime",
    label: "Restart bridge runtime",
    reason: "Restart the bridge manager to recover adapter startup and runtime issues.",
    scope: "global" as const,
    ipcChannel: "bridge:run-action",
    ipcArgs: { action: "restart_bridge_runtime" },
    expectedOutcome: "Stop and restart the bridge runtime.",
  },
  probePlatform: (platform: string) => ({
    actionType: "probe_platform",
    label: `Probe ${platform} adapter`,
    reason: "Re-check adapter readiness before making additional changes.",
    scope: "adapter" as const,
    ipcChannel: "bridge:run-action",
    ipcArgs: { action: "probe_platform", platform },
    expectedOutcome: "Return the latest probe result for this adapter.",
  }),
  reviewBindings: {
    actionType: "review_bindings",
    label: "Review bridge bindings",
    reason: "Inspect the current binding map before assuming routing is healthy.",
    scope: "binding" as const,
    ipcChannel: null,
    ipcArgs: {},
    expectedOutcome: "Inspect recent bridge bindings.",
  },
} as const;

function boundedActions(
  incidentType: DesktopBridgeIncidentType,
  adapterPlatform: string | null,
  bindingId: string | null,
): DesktopBridgeRecommendedAction[] {
  const action = (
    actionId: string,
    config: {
      actionType: string;
      label: string;
      reason: string;
      scope: "global" | "adapter" | "binding";
      ipcChannel: string | null;
      ipcArgs: Record<string, unknown>;
      expectedOutcome: string;
    },
  ): DesktopBridgeRecommendedAction => ({
    actionId,
    actionType: config.actionType,
    label: config.label,
    reason: config.reason,
    riskLevel: "low",
    requiresConfirmation: true,
    executableNow: config.ipcChannel === "bridge:run-action",
    scope: config.scope,
    platform: adapterPlatform,
    bindingId,
    ipcChannel: config.ipcChannel,
    ipcArgs: config.ipcArgs,
    expectedOutcome: config.expectedOutcome,
  });

  switch (incidentType) {
    case "bridge_manager_down":
      return [action("restart-bridge", INCIDENT_ACTIONS.restartBridge)];
    case "adapter_start_failure":
    case "adapter_runtime_failure":
      return adapterPlatform
        ? [
            action("probe-platform", INCIDENT_ACTIONS.probePlatform(adapterPlatform)),
            action("restart-bridge", INCIDENT_ACTIONS.restartBridge),
          ]
        : [action("restart-bridge", INCIDENT_ACTIONS.restartBridge)];
    case "bridge_delivery_failure":
      return [
        action("review-bindings", INCIDENT_ACTIONS.reviewBindings),
        ...(adapterPlatform
          ? [action("probe-platform", INCIDENT_ACTIONS.probePlatform(adapterPlatform))]
          : []),
      ];
    default:
      return [];
  }
}

function latestObservation(
  observations: DesktopBridgeObservationRecord[],
  observationType: DesktopBridgeObservationRecord["observationType"],
) {
  return observations.find((item) => item.observationType === observationType) ?? null;
}

function filteredObservations(
  observations: DesktopBridgeObservationRecord[],
  request: DesktopBridgeDiagnoseRequest,
) {
  return observations.filter((observation) => {
    if (request.adapterPlatform && observation.adapterPlatform !== request.adapterPlatform) {
      return false;
    }
    if (request.bindingId && observation.bindingId !== request.bindingId) {
      return false;
    }
    if (request.threadId && observation.threadId !== request.threadId) {
      return false;
    }
    return true;
  });
}

function resolveAdapterStatus(
  status: DesktopBridgeStatus,
  adapterPlatform: string | null | undefined,
): DesktopBridgeAdapterStatus | null {
  if (!adapterPlatform) {
    return null;
  }
  return status.adapters.find((adapter) => adapter.platform === adapterPlatform) ?? null;
}

function buildEvidence(
  context: BridgeRuntimeContext,
  request: DesktopBridgeDiagnoseRequest,
  primaryObservation: DesktopBridgeObservationRecord | null,
) {
  return {
    bridgeStatus: context.status,
    settings: context.settings,
    bindings: request.bindingId
      ? context.bindings.filter((binding) => binding.id === request.bindingId)
      : context.bindings,
    weixinAccounts: context.weixinAccounts,
    recentObservations: filteredObservations(context.observations, request).slice(0, 10),
    primaryObservation,
  };
}

export function diagnoseBridgeIncident(
  context: BridgeRuntimeContext,
  request: DesktopBridgeDiagnoseRequest,
): BridgeIncidentInput {
  const observations = filteredObservations(context.observations, request);
  const adapterStatus = resolveAdapterStatus(context.status, request.adapterPlatform);
  const startFailure = latestObservation(observations, "adapter_start_failed");
  const runtimeFailure = latestObservation(observations, "adapter_runtime_error");
  const deliveryFailure = latestObservation(observations, "bridge_delivery_failed");

  let incidentType: DesktopBridgeIncidentType;
  let severity: DesktopBridgeIncidentSeverity;
  let summary: string;
  let explanation: string;
  let hypothesis: string;
  let confidence: number;
  let adapterPlatform = request.adapterPlatform ?? null;
  let bindingId = request.bindingId ?? null;
  let threadId = request.threadId ?? null;
  let primaryObservation: DesktopBridgeObservationRecord | null = null;

  if (deliveryFailure) {
    incidentType = "bridge_delivery_failure";
    severity = "error";
    primaryObservation = deliveryFailure;
    adapterPlatform = deliveryFailure.adapterPlatform;
    bindingId = deliveryFailure.bindingId;
    threadId = deliveryFailure.threadId;
    summary = `${adapterPlatform ?? "bridge"} delivery failed`;
    explanation = "A bridge message reached the delivery layer but could not be delivered successfully.";
    hypothesis = "The adapter send path failed while delivering a bridge reply.";
    confidence = 0.9;
  } else if (runtimeFailure || adapterStatus?.error) {
    incidentType = "adapter_runtime_failure";
    severity = "error";
    primaryObservation = runtimeFailure;
    adapterPlatform = adapterPlatform ?? runtimeFailure?.adapterPlatform ?? adapterStatus?.platform ?? null;
    summary = `${adapterPlatform ?? "adapter"} runtime failure detected`;
    explanation = "The adapter appears to have started but later entered an error state or failed in its runtime loop.";
    hypothesis = runtimeFailure?.details?.error && typeof runtimeFailure.details.error === "string"
      ? runtimeFailure.details.error
      : adapterStatus?.error ?? "The adapter runtime loop is failing after startup.";
    confidence = 0.85;
  } else if (startFailure) {
    incidentType = "adapter_start_failure";
    severity = "error";
    primaryObservation = startFailure;
    adapterPlatform = adapterPlatform ?? startFailure.adapterPlatform;
    summary = `${adapterPlatform ?? "adapter"} failed to start`;
    explanation = "The adapter could not enter a running state during bridge startup.";
    hypothesis = startFailure.details?.error && typeof startFailure.details.error === "string"
      ? startFailure.details.error
      : "The adapter failed during startup.";
    confidence = 0.9;
  } else if (!context.status.running || context.status.adapters.every((adapter) => !adapter.running)) {
    incidentType = "bridge_manager_down";
    severity = context.status.enabledPlatforms.length > 0 ? "error" : "warning";
    primaryObservation = latestObservation(observations, "bridge_manager_start_failed");
    summary = "Bridge manager is not running";
    explanation = "The bridge runtime is currently not running, so no adapter can process bridge traffic.";
    hypothesis = context.status.enabledPlatforms.length > 0
      ? "No enabled adapter successfully entered a running state."
      : "The bridge manager was not started or no platforms are enabled.";
    confidence = 0.8;
  } else {
    incidentType = "adapter_runtime_failure";
    severity = "warning";
    summary = "Bridge issue could not be classified conclusively";
    explanation = "The bridge state did not match one of the first-version incident playbooks with high confidence.";
    hypothesis = "More runtime evidence is needed to classify this issue precisely.";
    confidence = 0.35;
  }

  return {
    source: request.source,
    incidentType,
    severity,
    status: "open",
    adapterPlatform,
    bindingId,
    threadId,
    summary,
    userVisibleExplanation: explanation,
    rootCauseHypothesis: hypothesis,
    confidence,
    recommendedActions: boundedActions(incidentType, adapterPlatform, bindingId),
    executedActions: [],
    evidence: buildEvidence(context, request, primaryObservation),
    resolutionNote: null,
  };
}

export function createBridgeIncidentController(deps: BridgeIncidentControllerDependencies) {
  return {
    listIncidents(filters: DesktopBridgeIncidentFilters = {}) {
      return deps.incidentStore.listIncidents(filters);
    },
    getIncident(incidentId: string) {
      return deps.incidentStore.getIncident(incidentId);
    },
    dismissIncident(incidentId: string) {
      return deps.incidentStore.dismissIncident(incidentId);
    },
    diagnose(request: DesktopBridgeDiagnoseRequest) {
      const context: BridgeRuntimeContext = {
        status: deps.getStatus(),
        settings: deps.loadSettings().settings,
        bindings: deps.listBindings(),
        weixinAccounts: deps.listWeixinAccounts(),
        observations: deps.listObservations({
          adapterPlatform: request.adapterPlatform ?? undefined,
          limit: 50,
        }),
      };
      const incident = diagnoseBridgeIncident(context, request);
      return deps.incidentStore.recordIncident(incident);
    },
  };
}
